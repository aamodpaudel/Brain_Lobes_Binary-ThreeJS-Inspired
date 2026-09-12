'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DOMAIN_LIST, type DomainKey } from '@/lib/domains';
import { inputClass, primaryButtonClass, cardClass } from '@/components/admin/adminFormStyles';

interface NoteRow {
    id: number;
    domain: DomainKey;
    title: string;
    slug: string;
    published: boolean;
}

export default function NotesListPage() {
    const [notes, setNotes] = useState<NoteRow[]>([]);
    const [filter, setFilter] = useState<string>('ALL');
    const router = useRouter();

    const load = () => fetch('/api/notes').then((r) => r.json()).then(setNotes);

    useEffect(() => {
        load();
    }, []);

    const createNote = async () => {
        const res = await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain: DOMAIN_LIST[0].key, title: 'Untitled Note' }),
        });
        if (res.ok) {
            const note = await res.json();
            router.push(`/admin/notes/${note.id}`);
        }
    };

    const deleteNote = async (id: number) => {
        if (!confirm('Delete this note?')) return;
        await fetch(`/api/notes/${id}`, { method: 'DELETE' });
        load();
    };

    const visible = filter === 'ALL' ? notes : notes.filter((n) => n.domain === filter);

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-3xl font-light">Notes</h1>
                <button onClick={createNote} className={primaryButtonClass} style={{ backgroundColor: 'var(--accent)' }}>
                    + New Note
                </button>
            </div>

            <select className={`${inputClass} mb-4 max-w-xs`} value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="ALL">All domains</option>
                {DOMAIN_LIST.map((d) => (
                    <option key={d.key} value={d.key}>
                        {d.label}
                    </option>
                ))}
            </select>

            <div className="flex flex-col gap-2">
                {visible.map((note) => (
                    <div key={note.id} className={`${cardClass} flex flex-wrap items-center justify-between gap-3 py-3`}>
                        <div>
                            <p className="font-medium">
                                {note.title} {!note.published && <span className="text-xs opacity-50">(draft)</span>}
                            </p>
                            <p className="text-xs opacity-60">{DOMAIN_LIST.find((d) => d.key === note.domain)?.label}</p>
                        </div>
                        <div className="flex gap-3 text-sm">
                            <Link href={`/admin/notes/${note.id}`} className="underline opacity-80 hover:opacity-100">
                                Edit
                            </Link>
                            <button onClick={() => deleteNote(note.id)} className="text-red-500 underline">
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
                {visible.length === 0 && <p className="opacity-60">No notes yet.</p>}
            </div>
        </div>
    );
}
