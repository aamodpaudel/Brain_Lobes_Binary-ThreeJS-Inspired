import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { domainBySlug, DOMAIN_LIST, type DomainKey } from '@/lib/domains';
import { RichContent } from '@/components/RichContent';

interface PageProps {
    params: Promise<{ domain: string; slug: string }>;
}

async function getRelatedNotes(noteId: number) {
    const links = await prisma.noteLink.findMany({
        where: { OR: [{ fromId: noteId }, { toId: noteId }] },
        include: { from: true, to: true },
    });
    return links.map((l) => (l.fromId === noteId ? l.to : l.from)).filter((n) => n.published);
}

export default async function NotePage({ params }: PageProps) {
    const { domain: domainSlug, slug } = await params;
    const domainMeta = domainBySlug(domainSlug);
    if (!domainMeta) notFound();

    const note = await prisma.note.findUnique({
        where: { domain_slug: { domain: domainMeta.key, slug } },
    });
    if (!note || !note.published) notFound();

    const related = await getRelatedNotes(note.id);

    return (
        <div className="relative min-h-screen w-full" style={{ background: 'var(--background)' }}>
            <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10 sm:px-8">
                <div className="flex items-center justify-between text-sm">
                    <Link href={`/?domain=${domainMeta.slug}`} className="underline opacity-70 hover:opacity-100">
                        ← Back to {domainMeta.label}
                    </Link>
                    <span style={{ color: 'var(--muted)' }}>{domainMeta.label}</span>
                </div>

                <div>
                    <h1 className="text-3xl font-semibold">{note.title}</h1>
                    {note.summary && (
                        <p className="mt-2 text-base" style={{ color: 'var(--muted)' }}>
                            {note.summary}
                        </p>
                    )}
                </div>

                <div className="text-base leading-relaxed">
                    <RichContent html={note.content} />
                </div>

                {related.length > 0 && (
                    <div className="mt-6 border-t pt-5" style={{ borderColor: 'var(--border)' }}>
                        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide opacity-60">Related notes</h2>
                        <div className="flex flex-wrap gap-2">
                            {related.map((r) => {
                                const rDomain = DOMAIN_LIST.find((d) => d.key === (r.domain as DomainKey));
                                return (
                                    <Link
                                        key={r.id}
                                        href={`/mind/${rDomain?.slug ?? domainSlug}/${r.slug}`}
                                        className="rounded-full border px-3 py-1 text-sm hover:opacity-80"
                                        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
                                    >
                                        {r.title}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
