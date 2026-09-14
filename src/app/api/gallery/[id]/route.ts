import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminSession } from '@/lib/auth';
import { deleteUploadFile } from '@/lib/uploads';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        if (!(await isAdminSession())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const id = Number((await params).id);
        const data = await req.json();
        const photo = await prisma.galleryPhoto.update({
            where: { id },
            data: {
                ...(typeof data.caption === 'string' ? { caption: data.caption } : {}),
                ...(typeof data.order === 'number' ? { order: data.order } : {}),
            },
        });

        return NextResponse.json(photo);
    } catch {
        return NextResponse.json({ error: 'Failed to update photo' }, { status: 500 });
    }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        if (!(await isAdminSession())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const id = Number((await params).id);
        const photo = await prisma.galleryPhoto.findUnique({ where: { id } });
        if (!photo) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        await prisma.galleryPhoto.delete({ where: { id } });
        await deleteUploadFile(photo.path);

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
    }
}
