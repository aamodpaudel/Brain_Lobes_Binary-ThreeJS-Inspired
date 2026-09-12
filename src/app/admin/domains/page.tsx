'use client';

import { useEffect, useState } from 'react';
import { QuillEditor } from '@/components/admin/QuillEditor';
import { inputClass, labelClass, primaryButtonClass, cardClass } from '@/components/admin/adminFormStyles';

interface DomainRow {
    domain: string;
    order: number;
    label: string;
    tagline: string;
    description: string;
    colorHex: string;
}

export default function DomainsPage() {
    const [domains, setDomains] = useState<DomainRow[]>([]);
    const [savingKey, setSavingKey] = useState<string | null>(null);

    const load = () => fetch('/api/domains').then((r) => r.json()).then(setDomains);

    useEffect(() => {
        load();
    }, []);

    const update = (domain: string, patch: Partial<DomainRow>) => {
        setDomains((prev) => prev.map((d) => (d.domain === domain ? { ...d, ...patch } : d)));
    };

    const save = async (row: DomainRow) => {
        setSavingKey(row.domain);
        await fetch('/api/domains', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(row),
        });
        setSavingKey(null);
    };

    return (
        <div>
            <h1 className="mb-6 text-3xl font-light">Domains</h1>
            <div className="flex flex-col gap-5">
                {domains
                    .sort((a, b) => a.order - b.order)
                    .map((row) => (
                        <div key={row.domain} className={cardClass}>
                            <div className="mb-3 flex items-center gap-3">
                                <input
                                    type="color"
                                    value={row.colorHex}
                                    onChange={(e) => update(row.domain, { colorHex: e.target.value })}
                                    className="h-8 w-8 cursor-pointer rounded border-0"
                                />
                                <h2 className="text-lg font-semibold">
                                    {row.order}. {row.label}
                                </h2>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className={labelClass}>Label</label>
                                    <input className={inputClass} value={row.label} onChange={(e) => update(row.domain, { label: e.target.value })} />
                                </div>
                                <div>
                                    <label className={labelClass}>Tagline</label>
                                    <input className={inputClass} value={row.tagline} onChange={(e) => update(row.domain, { tagline: e.target.value })} />
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className={labelClass}>Description (shown in the domain box)</label>
                                <QuillEditor value={row.description} onChange={(val) => update(row.domain, { description: val })} />
                            </div>

                            <button
                                onClick={() => save(row)}
                                disabled={savingKey === row.domain}
                                className={`${primaryButtonClass} mt-4`}
                                style={{ backgroundColor: row.colorHex }}
                            >
                                {savingKey === row.domain ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    ))}
            </div>
        </div>
    );
}
