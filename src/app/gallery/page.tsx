import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { GalleryGrid } from './GalleryGrid';

export const metadata = {
    title: 'Gallery — My Mind In A Box',
};

// Without this, Next statically prerenders this page once at build time (it's a fixed route
// with no params, so nothing else marks it dynamic) — meaning photos uploaded through the admin
// panel afterward would never show up here without a whole new deploy.
export const dynamic = 'force-dynamic';

export default async function GalleryPage() {
    const photos = await prisma.galleryPhoto.findMany({
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, path: true, caption: true },
    });

    return (
        <div className="relative min-h-screen w-full" style={{ background: 'var(--background)' }}>
            <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10 sm:px-8">
                <div className="flex items-center justify-between text-sm">
                    <Link href="/" className="underline opacity-70 hover:opacity-100">
                        ← Back home
                    </Link>
                </div>

                <div>
                    <h1 className="text-3xl font-semibold">Gallery</h1>
                    <p className="mt-2 text-base" style={{ color: 'var(--muted)' }}>
                        Photos, self-hosted here rather than linked out.
                    </p>
                </div>

                {photos.length === 0 ? (
                    <p style={{ color: 'var(--muted)' }}>No photos here yet.</p>
                ) : (
                    <GalleryGrid photos={photos} />
                )}
            </div>
        </div>
    );
}
