import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminSession } from '@/lib/auth';
import { DOMAIN_LIST, isDomainKey } from '@/lib/domains';

export async function GET() {
    try {
        const existing = await prisma.domainInfo.findMany();
        const byDomain = new Map(existing.map((d) => [d.domain, d]));

        // Ensure all 5 fixed domains exist so the admin/home UI always has something to render.
        const missing = DOMAIN_LIST.filter((d) => !byDomain.has(d.key));
        if (missing.length > 0) {
            await prisma.domainInfo.createMany({
                data: missing.map((d) => ({
                    domain: d.key,
                    order: d.order,
                    label: d.label,
                    tagline: '',
                    description: '',
                })),
            });
        }

        const rows = await prisma.domainInfo.findMany({ orderBy: { order: 'asc' } });
        return NextResponse.json(rows);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch domains' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        if (!(await isAdminSession())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await req.json();
        if (!isDomainKey(data.domain)) {
            return NextResponse.json({ error: 'Invalid domain' }, { status: 400 });
        }

        const updated = await prisma.domainInfo.update({
            where: { domain: data.domain },
            data: {
                label: data.label,
                tagline: data.tagline,
                description: data.description,
                colorHex: data.colorHex,
            },
        });

        return NextResponse.json(updated);
    } catch {
        return NextResponse.json({ error: 'Failed to update domain' }, { status: 500 });
    }
}
