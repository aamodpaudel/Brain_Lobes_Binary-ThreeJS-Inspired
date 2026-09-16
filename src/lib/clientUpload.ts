'use client';

export interface UploadedFileMeta {
    path: string;
    filename: string;
    mimeType: string;
    size: number;
}

/** Uploads a file and returns what the caller should send on to its own "create the record"
 * endpoint. In production (R2 configured), asks the server for a presigned URL and PUTs the
 * file straight to R2 from the browser — the file's bytes never pass through our own Vercel
 * function, which is the only way around its 4.5MB request body cap. Locally (no R2), just
 * falls back to a plain multipart POST to `directEndpoint`, unchanged from before.
 *
 * Throws with a human-readable message on any failure. */
export async function uploadFile(file: File, subdir: 'notes' | 'gallery', directEndpoint: string): Promise<UploadedFileMeta> {
    const presignRes = await fetch('/api/uploads/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, mimeType: file.type, size: file.size, subdir }),
    });
    const presignData = await presignRes.json();
    if (!presignRes.ok) throw new Error(presignData.error || 'Upload failed');

    if (presignData.direct) {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch(directEndpoint, { method: 'POST', body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        return data;
    }

    const putRes = await fetch(presignData.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
    });
    if (!putRes.ok) throw new Error('Upload to storage failed');

    const recordRes = await fetch(directEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            path: presignData.path,
            filename: presignData.filename,
            mimeType: presignData.mimeType,
            size: presignData.size,
        }),
    });
    const recordData = await recordRes.json();
    if (!recordRes.ok) throw new Error(recordData.error || 'Upload failed');
    return recordData;
}
