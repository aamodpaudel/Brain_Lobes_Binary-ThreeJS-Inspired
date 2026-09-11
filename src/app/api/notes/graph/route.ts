import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isDomainKey } from '@/lib/domains';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const domain = searchParams.get('domain');
        if (!domain || !isDomainKey(domain)) {
            return NextResponse.json({ error: 'Invalid domain' }, { status: 400 });
        }

        const notes = await prisma.note.findMany({
            where: { domain, published: true },
            select: { id: true, title: true, slug: true, summary: true },
        });

        const noteIds = notes.map((n) => n.id);
        const links = await prisma.noteLink.findMany({
            where: { fromId: { in: noteIds }, toId: { in: noteIds } },
        });

        const nodes = notes.map((n) => ({ id: n.id, name: n.title, slug: n.slug, summary: n.summary }));
        const edges = links.map((l) => ({ source: l.fromId, target: l.toId }));

        return NextResponse.json({ nodes, edges });
    } catch {
        return NextResponse.json({ error: 'Failed to fetch graph' }, { status: 500 });
    }
}
