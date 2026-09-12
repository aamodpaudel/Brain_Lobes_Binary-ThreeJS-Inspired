'use client';

import { useEffect, useState } from 'react';
import { QuillEditor } from '@/components/admin/QuillEditor';
import { inputClass, labelClass, primaryButtonClass, cardClass } from '@/components/admin/adminFormStyles';

interface GlobalSettingsData {
    id: number;
    title: string;
    tagline: string;
    bio: string;
    email: string;
    githubUrl: string | null;
    linkedinUrl: string | null;
    twitterUrl: string | null;
    vscoUrl: string | null;
}

export default function SettingsPage() {
    const [data, setData] = useState<GlobalSettingsData | null>(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetch('/api/settings')
            .then((r) => r.json())
            .then(setData);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!data) return;
        setSaving(true);
        setMessage('');

        const res = await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        setSaving(false);
        if (res.ok) {
            setMessage('Saved.');
        } else {
            const err = await res.json();
            setMessage(`Error: ${err.error}`);
        }
    };

    if (!data) return <p className="opacity-60">Loading…</p>;

    return (
        <div>
            <h1 className="mb-6 text-3xl font-light">Global Settings</h1>
            <form onSubmit={handleSubmit} className={`${cardClass} flex flex-col gap-4`}>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className={labelClass}>Title</label>
                        <input className={inputClass} value={data.title} onChange={(e) => setData({ ...data, title: e.target.value })} required />
                    </div>
                    <div>
                        <label className={labelClass}>Email</label>
                        <input className={inputClass} value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} />
                    </div>
                </div>

                <div>
                    <label className={labelClass}>Tagline</label>
                    <input className={inputClass} value={data.tagline} onChange={(e) => setData({ ...data, tagline: e.target.value })} />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                        <label className={labelClass}>GitHub URL</label>
                        <input className={inputClass} value={data.githubUrl ?? ''} onChange={(e) => setData({ ...data, githubUrl: e.target.value })} />
                    </div>
                    <div>
                        <label className={labelClass}>LinkedIn URL</label>
                        <input className={inputClass} value={data.linkedinUrl ?? ''} onChange={(e) => setData({ ...data, linkedinUrl: e.target.value })} />
                    </div>
                    <div>
                        <label className={labelClass}>Twitter / X URL</label>
                        <input className={inputClass} value={data.twitterUrl ?? ''} onChange={(e) => setData({ ...data, twitterUrl: e.target.value })} />
                    </div>
                </div>

                <div>
                    <label className={labelClass}>VSCO URL (Photography link)</label>
                    <input className={inputClass} value={data.vscoUrl ?? ''} onChange={(e) => setData({ ...data, vscoUrl: e.target.value })} placeholder="https://vsco.co/..." />
                </div>

                <div>
                    <label className={labelClass}>Bio</label>
                    <QuillEditor value={data.bio} onChange={(val) => setData({ ...data, bio: val })} />
                </div>

                <div className="mt-2 flex items-center gap-4">
                    <button type="submit" disabled={saving} className={primaryButtonClass} style={{ backgroundColor: 'var(--accent)' }}>
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                    {message && <span className="text-sm opacity-70">{message}</span>}
                </div>
            </form>
        </div>
    );
}
