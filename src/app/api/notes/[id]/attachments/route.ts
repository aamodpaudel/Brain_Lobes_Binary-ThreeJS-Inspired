import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminSession } from '@/lib/auth';
import { saveUpload, publicBaseUrl, UploadError, type SavedUpload } from '@/lib/uploads';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        if (!(await isAdminSession())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const noteId = Number((await params).id);
        const note = await prisma.note.findUnique({ where: { id: noteId } });
        if (!note) return NextResponse.json({ error: 'Note not found' }, { status: 404 });

        const isJson = (req.headers.get('content-type') || '').includes('application/json');
        let saved: SavedUpload;

        if (isJson) {
            // The file already landed in R2 via a presigned PUT (see /api/uploads/presign and
            // src/lib/clientUpload.ts) — this request is just recording it, so it's tiny
            // regardless of the attachment's actual size.
            const body = await req.json();
            if (typeof body.path !== 'string' || !body.path || typeof body.filename !== 'string' || typeof body.mimeType !== 'string' || typeof body.size !== 'number') {
                return NextResponse.json({ error: 'path, filename, mimeType, and size are required' }, { status: 400 });
            }
            const publicBase = publicBaseUrl();
            if (publicBase && !body.path.startsWith(`${publicBase}/`)) {
                return NextResponse.json({ error: 'path is not a recognized upload location' }, { status: 400 });
            }
            saved = { path: body.path, filename: body.filename, mimeType: body.mimeType, size: body.size };
        } else {
            const form = await req.formData();
            const file = form.get('file');
            if (!(file instanceof File)) {
                return NextResponse.json({ error: 'No file provided' }, { status: 400 });
            }
            saved = await saveUpload(file, 'notes');
        }

        const attachment = await prisma.noteAttachment.create({
            data: { noteId, ...saved },
        });

        return NextResponse.json(attachment);
    } catch (err) {
        if (err instanceof UploadError) {
            return NextResponse.json({ error: err.message }, { status: 400 });
        }
        console.error('Failed to upload attachment:', err);
        return NextResponse.json({ error: 'Failed to upload attachment' }, { status: 500 });
    }
}
