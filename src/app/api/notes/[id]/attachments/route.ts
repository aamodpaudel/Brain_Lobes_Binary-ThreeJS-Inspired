import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminSession } from '@/lib/auth';
import { saveUpload, UploadError } from '@/lib/uploads';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        if (!(await isAdminSession())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const noteId = Number((await params).id);
        const note = await prisma.note.findUnique({ where: { id: noteId } });
        if (!note) return NextResponse.json({ error: 'Note not found' }, { status: 404 });

        const form = await req.formData();
        const file = form.get('file');
        if (!(file instanceof File)) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const saved = await saveUpload(file, 'notes');
        const attachment = await prisma.noteAttachment.create({
            data: { noteId, ...saved },
        });

        return NextResponse.json(attachment);
    } catch (err) {
        if (err instanceof UploadError) {
            return NextResponse.json({ error: err.message }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to upload attachment' }, { status: 500 });
    }
}
