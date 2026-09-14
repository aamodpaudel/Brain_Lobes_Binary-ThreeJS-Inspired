import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminSession } from '@/lib/auth';
import { saveUpload, UploadError } from '@/lib/uploads';

export async function GET() {
    try {
        const photos = await prisma.galleryPhoto.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
        return NextResponse.json(photos);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch gallery' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        if (!(await isAdminSession())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const form = await req.formData();
        const file = form.get('file');
        if (!(file instanceof File)) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }
        const caption = typeof form.get('caption') === 'string' ? (form.get('caption') as string) : '';

        const saved = await saveUpload(file, 'gallery');
        const last = await prisma.galleryPhoto.findFirst({ orderBy: { order: 'desc' } });

        const photo = await prisma.galleryPhoto.create({
            data: { path: saved.path, caption, order: (last?.order ?? -1) + 1 },
        });

        return NextResponse.json(photo);
    } catch (err) {
        if (err instanceof UploadError) {
            return NextResponse.json({ error: err.message }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 });
    }
}
