import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminSession } from '@/lib/auth';
import { slugify } from '@/lib/slug';

async function getRelatedIds(noteId: number): Promise<number[]> {
    const links = await prisma.noteLink.findMany({
        where: { OR: [{ fromId: noteId }, { toId: noteId }] },
    });
    return links.map((l) => (l.fromId === noteId ? l.toId : l.fromId));
}

// NoteLink rows are stored with fromId < toId so a pair is never duplicated in both directions.
async function syncRelations(noteId: number, relatedIds: number[]) {
    const current = await getRelatedIds(noteId);
    const desired = new Set(relatedIds.filter((id) => id !== noteId));

    const toRemove = current.filter((id) => !desired.has(id));
    const toAdd = [...desired].filter((id) => !current.includes(id));

    await Promise.all(
        toRemove.map((otherId) => {
            const [fromId, toId] = noteId < otherId ? [noteId, otherId] : [otherId, noteId];
            return prisma.noteLink.deleteMany({ where: { fromId, toId } });
        }),
    );

    await Promise.all(
        toAdd.map((otherId) => {
            const [fromId, toId] = noteId < otherId ? [noteId, otherId] : [otherId, noteId];
            return prisma.noteLink.upsert({
                where: { fromId_toId: { fromId, toId } },
                update: {},
                create: { fromId, toId },
            });
        }),
    );
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        if (!(await isAdminSession())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const id = Number((await params).id);
        const note = await prisma.note.findUnique({ where: { id } });
        if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const relatedIds = await getRelatedIds(id);
        return NextResponse.json({ ...note, relatedIds });
    } catch {
        return NextResponse.json({ error: 'Failed to fetch note' }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        if (!(await isAdminSession())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const id = Number((await params).id);
        const data = await req.json();

        const existing = await prisma.note.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        let slug = existing.slug;
        if (data.slug && slugify(data.slug) !== existing.slug) {
            const baseSlug = slugify(data.slug);
            slug = baseSlug;
            let suffix = 2;
            while (
                await prisma.note.findFirst({
                    where: { domain: data.domain ?? existing.domain, slug, NOT: { id } },
                })
            ) {
                slug = `${baseSlug}-${suffix++}`;
            }
        }

        const note = await prisma.note.update({
            where: { id },
            data: {
                domain: data.domain ?? existing.domain,
                title: data.title ?? existing.title,
                slug,
                summary: data.summary ?? existing.summary,
                content: data.content ?? existing.content,
                published: data.published ?? existing.published,
            },
        });

        if (Array.isArray(data.relatedIds)) {
            await syncRelations(id, data.relatedIds.map(Number));
        }

        return NextResponse.json(note);
    } catch {
        return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
    }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        if (!(await isAdminSession())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const id = Number((await params).id);
        await prisma.note.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
    }
}
