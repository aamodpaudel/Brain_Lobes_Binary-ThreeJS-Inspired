import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

// Self-hosted: uploaded files live under public/uploads, served by Next.js's normal static
// file handling like the .glb models already there — no external storage service involved.
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
    path: string; // public path, e.g. "/uploads/notes/<uuid>-name.png"
    filename: string; // original filename, for display
    mimeType: string;
    size: number;
}

export class UploadError extends Error {}

/** Validates and writes an uploaded file under public/uploads/<subdir>/, returning what a
 * NoteAttachment or GalleryPhoto row needs. Filenames are randomized to avoid collisions and
 * path traversal — the original name is kept only for display, never as the actual path. */
export async function saveUpload(file: File, subdir: 'notes' | 'gallery'): Promise<SavedUpload> {
    if (!file || file.size === 0) throw new UploadError('No file provided');
    if (file.size > MAX_SIZE) throw new UploadError('File too large (20MB max)');
    if (!ALLOWED_MIME_TYPES.has(file.type)) throw new UploadError(`File type not allowed: ${file.type || 'unknown'}`);

    const dir = path.join(UPLOAD_ROOT, subdir);
    await mkdir(dir, { recursive: true });

    const ext = path.extname(file.name).slice(0, 10);
    const safeBase =
        path
            .basename(file.name, ext)
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .slice(0, 60) || 'file';
    const filename = `${randomUUID()}-${safeBase}${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), buffer);

    return {
        path: `/uploads/${subdir}/${filename}`,
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
    };
}

/** Removes a previously-saved file given its public path. Resolves strictly within
 * UPLOAD_ROOT and silently no-ops on anything else or on a missing file — deleting the DB
 * row is what matters most; a stray file left on disk is a much smaller problem than a bug
 * elsewhere turning this into a path-traversal delete of an arbitrary file. */
export async function deleteUploadFile(publicPath: string): Promise<void> {
    if (!publicPath.startsWith('/uploads/')) return;
    const resolved = path.join(UPLOAD_ROOT, publicPath.slice('/uploads/'.length));
    if (!resolved.startsWith(UPLOAD_ROOT)) return;
    await unlink(resolved).catch(() => {});
}
