import { NextResponse } from 'next/server';
import { isAdminSession } from '@/lib/auth';
import { createPresignedUpload, UploadError, type UploadSubdir } from '@/lib/uploads';

const VALID_SUBDIRS: UploadSubdir[] = ['notes', 'gallery'];

/** Step 1 of the production upload flow: given a file's metadata (not its bytes — this request
 * is tiny), returns a URL the browser can PUT the actual file to directly on Cloudflare R2,
 * bypassing our own function's request-body limit entirely. Returns `{ direct: true }` instead
 * when R2 isn't configured (local dev), telling the caller to fall back to a plain multipart
 * POST to the existing endpoint (see src/lib/clientUpload.ts). */
export async function POST(req: Request) {
    try {
        if (!(await isAdminSession())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { filename, mimeType, size, subdir } = await req.json();
        if (typeof filename !== 'string' || typeof mimeType !== 'string' || typeof size !== 'number') {
            return NextResponse.json({ error: 'filename, mimeType, and size are required' }, { status: 400 });
        }
        if (!VALID_SUBDIRS.includes(subdir)) {
            return NextResponse.json({ error: 'Invalid subdir' }, { status: 400 });
        }

        const presigned = await createPresignedUpload(filename, mimeType, size, subdir);
        if (!presigned) {
            return NextResponse.json({ direct: true });
        }

        return NextResponse.json({ direct: false, ...presigned });
    } catch (err) {
        if (err instanceof UploadError) {
            return NextResponse.json({ error: err.message }, { status: 400 });
        }
        console.error('Failed to presign upload:', err);
        return NextResponse.json({ error: 'Failed to prepare upload' }, { status: 500 });
    }
}
