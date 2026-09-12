'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DOMAIN_LIST, type DomainKey } from '@/lib/domains';
import { QuillEditor } from '@/components/admin/QuillEditor';
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass, cardClass } from '@/components/admin/adminFormStyles';

interface NoteDetail {
    id: number;
    domain: DomainKey;
    title: string;
    slug: string;
    summary: string;
    content: string;
    published: boolean;
    relatedIds: number[];
}

interface NoteOption {
    id: number;
    title: string;
    domain: DomainKey;
}

export default function NoteEditorPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const [note, setNote] = useState<NoteDetail | null>(null);
    const [allNotes, setAllNotes] = useState<NoteOption[]>([]);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetch(`/api/notes/${params.id}`).then((r) => r.json()).then(setNote);
        fetch('/api/notes').then((r) => r.json()).then(setAllNotes);
    }, [params.id]);

    const save = async () => {
        if (!note) return;
        setSaving(true);
        setMessage('');
        const res = await fetch(`/api/notes/${note.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(note),
        });
        setSaving(false);
        setMessage(res.ok ? 'Saved.' : 'Failed to save.');
        if (res.ok) {
            const refreshed = await fetch(`/api/notes/${note.id}`).then((r) => r.json());
            setNote(refreshed);
        }
    };

    const toggleRelated = (id: number) => {
        if (!note) return;
        setNote({
            ...note,
            relatedIds: note.relatedIds.includes(id) ? note.relatedIds.filter((r) => r !== id) : [...note.relatedIds, id],
        });
    };

    if (!note) return <p className="opacity-60">Loading…</p>;

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-3xl font-light">Edit Note</h1>
                <button onClick={() => router.push('/admin/notes')} className={secondaryButtonClass}>
                    ← All Notes
                </button>
            </div>

            <div className={`${cardClass} flex flex-col gap-4`}>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className={labelClass}>Title</label>
                        <input className={inputClass} value={note.title} onChange={(e) => setNote({ ...note, title: e.target.value })} />
                    </div>
                    <div>
                        <label className={labelClass}>Domain</label>
                        <select className={inputClass} value={note.domain} onChange={(e) => setNote({ ...note, domain: e.target.value as DomainKey })}>
                            {DOMAIN_LIST.map((d) => (
                                <option key={d.key} value={d.key}>
                                    {d.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className={labelClass}>Slug</label>
                    <input className={inputClass} value={note.slug} onChange={(e) => setNote({ ...note, slug: e.target.value })} />
                </div>

                <div>
                    <label className={labelClass}>Summary</label>
                    <input className={inputClass} value={note.summary} onChange={(e) => setNote({ ...note, summary: e.target.value })} />
                </div>

                <div>
                    <label className={labelClass}>Content</label>
                    <QuillEditor value={note.content} onChange={(val) => setNote({ ...note, content: val })} />
                </div>

                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={note.published} onChange={(e) => setNote({ ...note, published: e.target.checked })} />
                    Published
                </label>

                <div>
                    <label className={labelClass}>Related notes</label>
                    <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-md border p-2" style={{ borderColor: 'var(--border)' }}>
                        {allNotes
                            .filter((n) => n.id !== note.id)
                            .map((n) => (
                                <label key={n.id} className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={note.relatedIds.includes(n.id)} onChange={() => toggleRelated(n.id)} />
                                    {n.title}
                                    <span className="text-xs opacity-50">{DOMAIN_LIST.find((d) => d.key === n.domain)?.label}</span>
                                </label>
                            ))}
                    </div>
                </div>

                <div className="mt-2 flex items-center gap-4">
                    <button onClick={save} disabled={saving} className={primaryButtonClass} style={{ backgroundColor: 'var(--accent)' }}>
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                    {message && <span className="text-sm opacity-70">{message}</span>}
                </div>
            </div>
        </div>
    );
}
