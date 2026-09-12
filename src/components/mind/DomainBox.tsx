'use client';

import type { DomainKey } from '@/lib/domains';
import { RichContent } from '../RichContent';
import { DomainIcon2D } from './icons/DomainIcon2D';

export interface DomainInfoData {
    domain: DomainKey;
    label: string;
    tagline: string;
    description: string;
    colorHex: string;
}

interface DomainBoxProps {
    info: DomainInfoData;
    onExplore: () => void;
    onClose: () => void;
    exploring: boolean;
}

export function DomainBox({ info, onExplore, onClose, exploring }: DomainBoxProps) {
    return (
        <div
            className="w-full max-w-sm rounded-xl border p-5 shadow-lg backdrop-blur-xl"
            style={{
                borderColor: 'var(--border)',
                backgroundColor: 'color-mix(in srgb, var(--surface) 88%, transparent)',
            }}
        >
            <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                    <h3 className="text-lg font-semibold" style={{ color: info.colorHex }}>
                        {info.label}
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>
                        {info.tagline}
                    </p>
                </div>
                <button
                    onClick={onClose}
                    aria-label="Close"
                    className="shrink-0 rounded-full border px-2 py-0.5 text-xs opacity-70 hover:opacity-100"
                    style={{ borderColor: 'var(--border)' }}
                >
                    ✕
                </button>
            </div>

            <DomainIcon2D domain={info.domain} color={info.colorHex} />

            {info.description && (
                <div className="mt-3 text-sm">
                    <RichContent html={info.description} />
                </div>
            )}

            <button
                onClick={onExplore}
                className="mt-4 w-full rounded-lg py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: info.colorHex }}
            >
                {exploring ? 'Hide Notes' : 'Explore Notes'}
            </button>
        </div>
    );
}
