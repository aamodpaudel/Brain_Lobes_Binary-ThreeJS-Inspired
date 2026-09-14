'use client';

import { useEffect, useState } from 'react';

interface Photo {
    id: number;
    path: string;
    caption: string;
}

/** A plain responsive grid with a click-to-enlarge lightbox — no library, just a fixed overlay
 * and an Escape/click-outside handler, since that's all a personal photo gallery needs. */
export function GalleryGrid({ photos }: { photos: Photo[] }) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    useEffect(() => {
        if (openIndex === null) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpenIndex(null);
            else if (e.key === 'ArrowRight') setOpenIndex((i) => (i === null ? i : (i + 1) % photos.length));
            else if (e.key === 'ArrowLeft') setOpenIndex((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [openIndex, photos.length]);

    const active = openIndex !== null ? photos[openIndex] : null;

    return (
        <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {photos.map((photo, i) => (
                    <button
                        key={photo.id}
                        onClick={() => setOpenIndex(i)}
                        className="group aspect-square overflow-hidden rounded-lg border"
                        style={{ borderColor: 'var(--border)' }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded, unknown dimensions */}
                        <img
                            src={photo.path}
                            alt={photo.caption || 'Gallery photo'}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                    </button>
                ))}
            </div>

            {active && (
                <div
                    className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 p-6"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--background) 90%, black)' }}
                    onClick={() => setOpenIndex(null)}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded, unknown dimensions */}
                    <img
                        src={active.path}
                        alt={active.caption || 'Gallery photo'}
                        className="max-h-[80vh] max-w-full rounded-lg object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                    {active.caption && <p className="max-w-xl text-center text-sm" style={{ color: 'var(--foreground)' }}>{active.caption}</p>}
                    <button
                        onClick={() => setOpenIndex(null)}
                        aria-label="Close"
                        className="absolute right-4 top-4 rounded-full border px-3 py-1 text-sm"
                        style={{ borderColor: 'var(--border)', color: 'var(--foreground)', backgroundColor: 'var(--surface)' }}
                    >
                        ✕
                    </button>
                </div>
            )}
        </>
    );
}
