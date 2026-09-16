import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Local dev fallback only — public/uploads works fine on a machine with a persistent disk, but
// not on Vercel's ephemeral filesystem. Whenever R2 credentials are present (production), those
// are used instead; this path only runs when they're absent (`npm run dev` with a bare .env).
const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads');
// Vercel serverless functions cap request bodies at 4.5MB regardless of this — real photos
// routinely exceed that, which is why production goes through a presigned direct-to-R2 upload
// instead of ever sending the file through our own function (see createPresignedUpload below).
// This limit is the one that actually applies there, and to the local-fallback path here.
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

// Deliberately excludes anything a browser might execute as a document (html, svg with
// embedded scripts) — uploads are admin-only so the trust boundary is already high, but there's
// no reason to accept types that could turn a direct file link into a self-XSS vector.
const ALLOWED_MIME_TYPES = new Set([
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/zip',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

export type UploadSubdir = 'notes' | 'gallery';

export interface SavedUpload {
    path: string; // a full R2 URL in production, or a local "/uploads/..." path in dev
    filename: string; // original filename, for display
    mimeType: string;
    size: number;
}

export interface PresignedUpload {
    uploadUrl: string; // PUT here directly from the browser
    path: string; // the eventual public URL — save this once the PUT succeeds
    filename: string;
    mimeType: string;
    size: number;
}

export class UploadError extends Error {}

function validate(filename: string, mimeType: string, size: number): void {
    if (!filename || size <= 0) throw new UploadError('No file provided');
    if (size > MAX_SIZE) throw new UploadError('File too large (20MB max)');
    if (!ALLOWED_MIME_TYPES.has(mimeType)) throw new UploadError(`File type not allowed: ${mimeType || 'unknown'}`);
}

/** Normalizes R2_PUBLIC_URL — trims any trailing slash, and adds `https://` if it's missing,
 * since a bare hostname like "files.example.com" (an easy thing to paste without the scheme)
 * would otherwise be treated as a *relative* URL by the browser wherever it's used as an <img
 * src> or <a href>, silently breaking every uploaded file's link instead of erroring loudly. */
export function publicBaseUrl(): string {
    const raw = r2EnvVar('R2_PUBLIC_URL').replace(/\/+$/, '');
    if (!raw) return '';
    return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

// A stray leading/trailing newline or space in a pasted env var value is a very easy mistake to
// make (copying from a dashboard's "copy" button, a terminal, etc.) and a nasty one to debug —
// it doesn't fail loudly, it just makes R2 look for a bucket/key that includes a literal "\n"
// and silently doesn't match anything, which from the browser just looks like a CORS failure
// (R2 returns no CORS headers for a request that doesn't resolve to a real bucket at all,
// which is indistinguishable from a real CORS misconfiguration without inspecting the request
// URL byte-for-byte). Every R2 env var is trimmed before use for exactly this reason.
function r2EnvVar(name: string): string {
    return (process.env[name] || '').trim();
}

/** Normalizes R2_BUCKET_NAME (see the trimming note above) — exported so route handlers doing
 * their own sanity checks against a stored path use the exact same value this module does. */
export function r2BucketName(): string {
    return r2EnvVar('R2_BUCKET_NAME');
}

function r2Client(): S3Client | null {
    const accountId = r2EnvVar('R2_ACCOUNT_ID');
    const accessKeyId = r2EnvVar('R2_ACCESS_KEY_ID');
    const secretAccessKey = r2EnvVar('R2_SECRET_ACCESS_KEY');
    if (!accountId || !accessKeyId || !secretAccessKey) return null;
    return new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
        // Recent AWS SDK versions add an automatic CRC32 request checksum by default. For a
        // *presigned* PUT that's actively wrong: the checksum gets computed (and signed) against
        // an empty body here, since the real file's bytes don't exist yet at presign time — the
        // browser's later PUT of the actual file would then mismatch that baked-in checksum and
        // fail. R2 doesn't require this the way AWS S3 does, so just turn it off.
        requestChecksumCalculation: 'WHEN_REQUIRED',
    });
}

function buildKey(filename: string, subdir: UploadSubdir): string {
    const ext = path.extname(filename).slice(0, 10);
    const safeBase =
        path
            .basename(filename, ext)
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .slice(0, 60) || 'file';
    // Randomized so nothing collides or overwrites, and so the key itself never leaks the
    // original filename to anyone who doesn't already have the full URL.
    return `${subdir}/${randomUUID()}-${safeBase}${ext}`;
}

/** Returns null when R2 isn't configured (local dev) — callers should fall back to saveUpload
 * (a plain multipart POST) in that case. When it IS configured, gives the browser a URL to PUT
 * the file straight to R2 with, so the file's bytes never pass through our own function at all —
 * the only way around Vercel's 4.5MB request body limit, since that's a platform limit on the
 * function itself, not something any of our own code or Next.js config can raise. */
export async function createPresignedUpload(filename: string, mimeType: string, size: number, subdir: UploadSubdir): Promise<PresignedUpload | null> {
    validate(filename, mimeType, size);

    const client = r2Client();
    if (!client) return null;

    const bucket = r2BucketName();
    const publicBase = publicBaseUrl();
    if (!bucket || !publicBase) {
        throw new UploadError('R2 is only partially configured — check R2_BUCKET_NAME and R2_PUBLIC_URL');
    }

    const key = buildKey(filename, subdir);
    const uploadUrl = await getSignedUrl(
        client,
        new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: mimeType,
            CacheControl: 'public, max-age=31536000, immutable',
        }),
        { expiresIn: 300 },
    );

    return { uploadUrl, path: `${publicBase}/${key}`, filename, mimeType, size };
}

/** The local-dev fallback: writes the file to public/uploads/ via our own server, going through
 * the request body the normal way. Only meant to be reached when createPresignedUpload returned
 * null (R2 unconfigured) — on Vercel, a file anywhere near a real photo's size would 413 before
 * this function even ran. */
export async function saveUpload(file: File, subdir: UploadSubdir): Promise<SavedUpload> {
    validate(file?.name, file?.type, file?.size ?? 0);

    const key = buildKey(file.name, subdir);
    const mimeType = file.type || 'application/octet-stream';
    const buffer = Buffer.from(await file.arrayBuffer());

    const fullPath = path.join(UPLOAD_ROOT, key);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, buffer);

    return { path: `/uploads/${key}`, filename: file.name, mimeType, size: file.size };
}

/** Removes a previously-saved file given its stored path/URL — local ("/uploads/...") or a full
 * R2 URL. Each branch is guarded so a bug elsewhere can't turn this into deleting an arbitrary
 * local file or an arbitrary R2 object outside this bucket; a stray file left behind is a much
 * smaller problem than that. */
export async function deleteUploadFile(storedPath: string): Promise<void> {
    if (storedPath.startsWith('/uploads/')) {
        const resolved = path.join(UPLOAD_ROOT, storedPath.slice('/uploads/'.length));
        if (!resolved.startsWith(UPLOAD_ROOT)) return;
        await unlink(resolved).catch(() => {});
        return;
    }

    const client = r2Client();
    const bucket = r2BucketName();
    const publicBase = publicBaseUrl();
    if (!client || !bucket || !publicBase || !storedPath.startsWith(`${publicBase}/`)) return;

    const key = storedPath.slice(publicBase.length + 1);
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => {});
}
