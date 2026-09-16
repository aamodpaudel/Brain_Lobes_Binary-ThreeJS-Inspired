'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DOMAIN_LIST, type DomainKey } from '@/lib/domains';
import { QuillEditor } from '@/components/admin/QuillEditor';
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass, cardClass } from '@/components/admin/adminFormStyles';
import { uploadFile } from '@/lib/clientUpload';

interface Attachment {
    id: number;
    filename: string;
    path: string;
    mimeType: string;
    size: number;
}

interface NoteDetail {
    id: number;
    domain: DomainKey;
    title: string;
    slug: string;
    summary: string;
    content: string;
    published: boolean;
    relatedIds: number[];
    attachments: Attachment[];
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
    const [uploading, setUploading] = useState(false);
    const [attachError, setAttachError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetch(`/api/notes/${params.id}`).then((r) => r.json()).then(setNote);
        fetch('/api/notes').then((r) => r.json()).then(setAllNotes);
    }, [params.id]);

    const refreshNote = async () => {
        if (!note) return;
        const refreshed = await fetch(`/api/notes/${note.id}`).then((r) => r.json());
        setNote(refreshed);
    };

    const handleFileUpload = async (file: File) => {
        if (!note) return;
        setUploading(true);
        setAttachError('');
        try {
            await uploadFile(file, 'notes', `/api/notes/${note.id}/attachments`);
            await refreshNote();
        } catch (err) {
            setAttachError(err instanceof Error ? err.message : 'Upload failed');
        }
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const deleteAttachment = async (attachmentId: number) => {
        if (!note) return;
        if (!confirm('Delete this attachment?')) return;
        const res = await fetch(`/api/notes/${note.id}/attachments/${attachmentId}`, { method: 'DELETE' });
        if (res.ok) await refreshNote();
    };

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

                <div>
                    <label className={labelClass}>Attachments</label>
                    {note.attachments.length > 0 && (
                        <ul className="mb-2 flex flex-col gap-1">
                            {note.attachments.map((a) => (
                                <li
                                    key={a.id}
                                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                                    style={{ borderColor: 'var(--border)' }}
                                >
                                    <a href={a.path} target="_blank" rel="noopener noreferrer" className="truncate underline hover:opacity-80">
                                        {a.filename}
                                    </a>
                                    <div className="flex shrink-0 items-center gap-3">
                                        <span className="text-xs opacity-50">{formatSize(a.size)}</span>
                                        <button type="button" onClick={() => deleteAttachment(a.id)} className="text-xs opacity-60 hover:opacity-100" style={{ color: '#dc2626' }}>
                                            Delete
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file);
                        }}
                        disabled={uploading}
                        className="block w-full text-sm"
                    />
                    <p className="mt-1 text-xs opacity-60">
                        {uploading ? 'Uploading…' : 'Images, PDFs, docs, and zips up to 20MB.'}
                    </p>
                    {attachError && <p className="mt-1 text-xs" style={{ color: '#dc2626' }}>{attachError}</p>}
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
