import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { DOMAIN_LIST } from '@/lib/domains';

const SITE_URL = 'https://www.aamodpaudel.com.np';

// Without this, Next.js can statically generate this file at build time (a DB query is not one
// of the APIs it treats as inherently dynamic) and never pick up notes added afterward.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const notes = await prisma.note.findMany({
        where: { published: true },
        select: { domain: true, slug: true, updatedAt: true },
    });

    const noteEntries: MetadataRoute.Sitemap = notes.flatMap((note) => {
        const meta = DOMAIN_LIST.find((d) => d.key === note.domain);
        if (!meta) return [];
        return [{ url: `${SITE_URL}/mind/${meta.slug}/${note.slug}`, lastModified: note.updatedAt }];
    });

    return [
        { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
        { url: `${SITE_URL}/gallery`, changeFrequency: 'monthly', priority: 0.5 },
        ...noteEntries,
    ];
}
