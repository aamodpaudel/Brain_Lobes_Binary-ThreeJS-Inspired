import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Local dev fallback only — public/uploads works fine on a machine with a persistent disk, but
// not on Vercel's ephemeral filesystem. Whenever R2 credentials are present (production), those
// are used instead; this path only runs when they're absent (`npm run dev` with a bare .env).
const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads');
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

export interface SavedUpload {
    path: string; // a full R2 URL in production, or a local "/uploads/..." path in dev
    filename: string; // original filename, for display
    mimeType: string;
    size: number;
}

export class UploadError extends Error {}

function r2Client(): S3Client | null {
    const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) return null;
    return new S3Client({
        region: 'auto',
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    });
}

function buildKey(file: File, subdir: 'notes' | 'gallery'): string {
    const ext = path.extname(file.name).slice(0, 10);
    const safeBase =
        path
            .basename(file.name, ext)
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .slice(0, 60) || 'file';
    // Randomized so nothing collides or overwrites, and so the key itself never leaks the
    // original filename to anyone who doesn't already have the full URL.
    return `${subdir}/${randomUUID()}-${safeBase}${ext}`;
}

/** Validates and stores an uploaded file, returning what a NoteAttachment or GalleryPhoto row
 * needs. Goes to Cloudflare R2 when R2_* env vars are set (production), or public/uploads/
 * otherwise (local dev) — see the module comment above. */
export async function saveUpload(file: File, subdir: 'notes' | 'gallery'): Promise<SavedUpload> {
    if (!file || file.size === 0) throw new UploadError('No file provided');
    if (file.size > MAX_SIZE) throw new UploadError('File too large (20MB max)');
    if (!ALLOWED_MIME_TYPES.has(file.type)) throw new UploadError(`File type not allowed: ${file.type || 'unknown'}`);

    const key = buildKey(file, subdir);
    const mimeType = file.type || 'application/octet-stream';
    const buffer = Buffer.from(await file.arrayBuffer());

    const client = r2Client();
    if (client) {
        const bucket = process.env.R2_BUCKET_NAME;
        const publicBase = (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '');
        if (!bucket || !publicBase) {
            throw new UploadError('R2 is only partially configured — check R2_BUCKET_NAME and R2_PUBLIC_URL');
        }

        await client.send(
            new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: buffer,
                ContentType: mimeType,
                // Keys are randomized/unique, so a long-lived cache is always safe.
                CacheControl: 'public, max-age=31536000, immutable',
            }),
        );

        return { path: `${publicBase}/${key}`, filename: file.name, mimeType, size: file.size };
    }

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
    const bucket = process.env.R2_BUCKET_NAME;
    const publicBase = (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '');
    if (!client || !bucket || !publicBase || !storedPath.startsWith(`${publicBase}/`)) return;

    const key = storedPath.slice(publicBase.length + 1);
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => {});
}
