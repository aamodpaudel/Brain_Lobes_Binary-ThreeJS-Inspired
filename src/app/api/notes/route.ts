import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminSession } from '@/lib/auth';
import { isDomainKey } from '@/lib/domains';
import { slugify } from '@/lib/slug';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const domain = searchParams.get('domain');
        const admin = await isAdminSession();

        const notes = await prisma.note.findMany({
            where: {
                ...(domain ? { domain } : {}),
                ...(admin ? {} : { published: true }),
            },
            select: {
                id: true,
                domain: true,
                title: true,
                slug: true,
                summary: true,
                published: true,
                updatedAt: true,
            },
            orderBy: { updatedAt: 'desc' },
        });

        return NextResponse.json(notes);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        if (!(await isAdminSession())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await req.json();
        if (!isDomainKey(data.domain)) {
            return NextResponse.json({ error: 'Invalid domain' }, { status: 400 });
        }
        if (!data.title || !String(data.title).trim()) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        const baseSlug = slugify(data.slug || data.title);
        let slug = baseSlug;
        let suffix = 2;
        while (await prisma.note.findUnique({ where: { domain_slug: { domain: data.domain, slug } } })) {
            slug = `${baseSlug}-${suffix++}`;
        }

        const note = await prisma.note.create({
            data: {
                domain: data.domain,
                title: data.title,
                slug,
                summary: data.summary || '',
                content: data.content || '',
                published: data.published ?? true,
            },
        });

        return NextResponse.json(note);
    } catch {
        return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
    }
}
