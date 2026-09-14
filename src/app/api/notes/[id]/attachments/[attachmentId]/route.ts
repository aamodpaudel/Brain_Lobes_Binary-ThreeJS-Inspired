import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminSession } from '@/lib/auth';
import { deleteUploadFile } from '@/lib/uploads';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; attachmentId: string }> }) {
    try {
        if (!(await isAdminSession())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, attachmentId } = await params;
        const noteId = Number(id);
        const attachment = await prisma.noteAttachment.findUnique({ where: { id: Number(attachmentId) } });
        // Scoped to the note in the URL, not just the attachment id, so one note's editor can't
        // be used to delete an attachment that belongs to a different note.
        if (!attachment || attachment.noteId !== noteId) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        await prisma.noteAttachment.delete({ where: { id: attachment.id } });
        await deleteUploadFile(attachment.path);

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete attachment' }, { status: 500 });
    }
}
