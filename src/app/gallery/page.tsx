import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { GalleryGrid } from './GalleryGrid';

export const metadata = {
    title: 'Gallery — My Mind In A Box',
};

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
