'use client';

import { useEffect, useRef, useState } from 'react';
import { cardClass, secondaryButtonClass } from '@/components/admin/adminFormStyles';

interface Photo {
    id: number;
    path: string;
    caption: string;
    order: number;
}

export default function GalleryAdminPage() {
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    // Local echo of caption edits so typing doesn't re-fetch on every keystroke — saved on blur.
    const [captionDrafts, setCaptionDrafts] = useState<Record<number, string>>({});

    const load = () => fetch('/api/gallery').then((r) => r.json()).then((data: Photo[]) => {
        setPhotos(data);
        setLoading(false);
    });

    useEffect(() => {
        load();
    }, []);

    const uploadFiles = async (files: FileList) => {
        setUploading(true);
        setError('');
        for (const file of Array.from(files)) {
            const body = new FormData();
            body.append('file', file);
            const res = await fetch('/api/gallery', { method: 'POST', body });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Upload failed' }));
                setError(err.error || 'Upload failed');
                break;
            }
        }
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        await load();
    };

    const saveCaption = async (id: number, caption: string) => {
        await fetch(`/api/gallery/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ caption }),
        });
    };

    const move = async (index: number, direction: -1 | 1) => {
        const other = index + direction;
        if (other < 0 || other >= photos.length) return;
        const a = photos[index];
        const b = photos[other];
        const reordered = [...photos];
        [reordered[index], reordered[other]] = [reordered[other], reordered[index]];
        setPhotos(reordered);
        await Promise.all([
            fetch(`/api/gallery/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: b.order }) }),
            fetch(`/api/gallery/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: a.order }) }),
        ]);
    };

    const remove = async (id: number) => {
        if (!confirm('Delete this photo?')) return;
        const res = await fetch(`/api/gallery/${id}`, { method: 'DELETE' });
        if (res.ok) setPhotos((p) => p.filter((photo) => photo.id !== id));
    };

    if (loading) return <p className="opacity-60">Loading…</p>;

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-light">Gallery</h1>
                    <p className="mt-1 text-sm opacity-60">
                        The self-hosted photo gallery, shown on the site at /gallery. The VSCO link in Settings still works separately if you keep it set.
                    </p>
                </div>
            </div>

            <div className={`${cardClass} mb-6 flex flex-col gap-2`}>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={uploading}
                    onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) uploadFiles(e.target.files);
                    }}
                    className="block w-full text-sm"
                />
                <p className="text-xs opacity-60">{uploading ? 'Uploading…' : 'Select one or more images (up to 20MB each).'}</p>
                {error && <p className="text-xs" style={{ color: '#dc2626' }}>{error}</p>}
            </div>

            {photos.length === 0 ? (
                <p className="opacity-60">No photos yet — upload one above.</p>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {photos.map((photo, i) => (
                        <div key={photo.id} className={`${cardClass} flex flex-col gap-2 p-3`}>
                            {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded, unknown dimensions */}
                            <img src={photo.path} alt={photo.caption || 'Gallery photo'} className="aspect-square w-full rounded-md object-cover" />
                            <input
                                className="w-full rounded-md border px-2 py-1 text-xs outline-none border-[color:var(--border)] bg-[color:var(--surface)]"
                                placeholder="Caption (optional)"
                                value={captionDrafts[photo.id] ?? photo.caption}
                                onChange={(e) => setCaptionDrafts((d) => ({ ...d, [photo.id]: e.target.value }))}
                                onBlur={(e) => saveCaption(photo.id, e.target.value)}
                            />
                            <div className="flex items-center justify-between">
                                <div className="flex gap-1">
                                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className={`${secondaryButtonClass} px-2 py-1 text-xs disabled:opacity-30`}>
                                        ↑
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => move(i, 1)}
                                        disabled={i === photos.length - 1}
                                        className={`${secondaryButtonClass} px-2 py-1 text-xs disabled:opacity-30`}
                                    >
                                        ↓
                                    </button>
                                </div>
                                <button type="button" onClick={() => remove(photo.id)} className="text-xs opacity-60 hover:opacity-100" style={{ color: '#dc2626' }}>
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
