import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminSession } from '@/lib/auth';
import { saveUpload, publicBaseUrl, UploadError } from '@/lib/uploads';

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

        const isJson = (req.headers.get('content-type') || '').includes('application/json');
        let uploadPath: string;
        let caption = '';

        if (isJson) {
            // The file already landed in R2 via a presigned PUT (see /api/uploads/presign and
            // src/lib/clientUpload.ts) — this request is just recording it, so it's tiny
            // regardless of the photo's actual size.
            const body = await req.json();
            if (typeof body.path !== 'string' || !body.path) {
                return NextResponse.json({ error: 'path is required' }, { status: 400 });
            }
            const publicBase = publicBaseUrl();
            if (publicBase && !body.path.startsWith(`${publicBase}/`)) {
                // Guards against this JSON path being used to point a record at an arbitrary
                // external URL instead of something we actually just presigned.
                return NextResponse.json({ error: 'path is not a recognized upload location' }, { status: 400 });
            }
            uploadPath = body.path;
            caption = typeof body.caption === 'string' ? body.caption : '';
        } else {
            const form = await req.formData();
            const file = form.get('file');
            if (!(file instanceof File)) {
                return NextResponse.json({ error: 'No file provided' }, { status: 400 });
            }
            caption = typeof form.get('caption') === 'string' ? (form.get('caption') as string) : '';
            uploadPath = (await saveUpload(file, 'gallery')).path;
        }

        const last = await prisma.galleryPhoto.findFirst({ orderBy: { order: 'desc' } });
        const photo = await prisma.galleryPhoto.create({
            data: { path: uploadPath, caption, order: (last?.order ?? -1) + 1 },
        });

        return NextResponse.json(photo);
    } catch (err) {
        if (err instanceof UploadError) {
            return NextResponse.json({ error: err.message }, { status: 400 });
        }
        console.error('Failed to upload photo:', err);
        return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 });
    }
}
