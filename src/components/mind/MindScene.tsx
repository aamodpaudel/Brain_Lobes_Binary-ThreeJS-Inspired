'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Github, Linkedin, Twitter } from 'lucide-react';
import { RichContent } from '../RichContent';
import { BrainCanvas } from './BrainCanvas';
import type { DomainGraphData } from './MorphField';
import { WindowChrome } from './WindowChrome';
import { useTheme } from '@/lib/useTheme';
import { DOMAINS, DOMAIN_LIST, domainByOrder, domainBySlug, type DomainKey } from '@/lib/domains';

export interface DomainInfoData {
    domain: DomainKey;
    label: string;
    tagline: string;
    description: string;
    colorHex: string;
}

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

/** Round, minimal nav button flanking the case — same prev/next logic as the toolbar's
 * chevrons, just bigger and next to the thing it actually navigates. */
function NavArrow({ direction, disabled, onClick }: { direction: 'prev' | 'next'; disabled: boolean; onClick: () => void }) {
    const Icon = direction === 'prev' ? ChevronLeft : ChevronRight;
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            aria-label={direction === 'prev' ? 'Previous domain' : 'Next domain'}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-opacity hover:opacity-100 disabled:opacity-20"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
        >
            <Icon size={18} />
        </button>
    );
}

export function MindScene() {
    const { theme, toggleTheme } = useTheme();
    const [settings, setSettings] = useState<GlobalSettingsData | null>(null);
    const [domains, setDomains] = useState<DomainInfoData[]>([]);
    const [graphs, setGraphs] = useState<Partial<Record<number, DomainGraphData>>>({});
    const [activeOrder, setActiveOrder] = useState<number | null>(null);

    const searchParams = useSearchParams();
    const pendingDomainSlugRef = useRef<string | null>(searchParams.get('domain'));

    useEffect(() => {
        Promise.all([
            fetch('/api/settings').then((r) => r.json()),
            fetch('/api/domains').then((r) => r.json()),
            // Every domain's notes graph, fetched up front (small payloads) so the particle
            // morph never has to wait mid-transition for the real node/edge data it draws.
            Promise.all(
                DOMAIN_LIST.map((d) =>
                    fetch(`/api/notes/graph?domain=${d.key}`)
                        .then((r) => r.json())
                        .catch(() => ({ nodes: [], edges: [] })),
                ),
            ),
        ]).then(([s, d, noteGraphs]: [GlobalSettingsData, DomainInfoData[], { nodes: DomainGraphData['nodes']; edges: DomainGraphData['edges'] }[]]) => {
            setSettings(s);
            setDomains(d);
            const byOrder: Partial<Record<number, DomainGraphData>> = {};
            DOMAIN_LIST.forEach((meta, i) => {
                const info = d.find((x) => x.domain === meta.key);
                byOrder[meta.order] = {
                    nodes: noteGraphs[i]?.nodes ?? [],
                    edges: noteGraphs[i]?.edges ?? [],
                    domainSlug: meta.slug,
                    colorHex: info?.colorHex ?? '#9a9a9a',
                };
            });
            setGraphs(byOrder);
        });
    }, []);

    const resetToIdle = useCallback(() => setActiveOrder(null), []);

    const handleLobeClick = useCallback((order: number | null) => {
        if (order == null) {
            resetToIdle();
            return;
        }
        setActiveOrder((prev) => (prev === order ? null : order));
    }, [resetToIdle]);

    const goPrev = useCallback(() => {
        handleLobeClick(activeOrder === null ? null : activeOrder === 1 ? null : activeOrder - 1);
    }, [activeOrder, handleLobeClick]);

    const goNext = useCallback(() => {
        handleLobeClick(activeOrder === null ? 1 : activeOrder + 1);
    }, [activeOrder, handleLobeClick]);

    // Deep-link support: a note page's "Back to <domain>" link passes ?domain=<slug>
    // so returning here reopens that domain instead of landing on the idle brain.
    useEffect(() => {
        const slug = pendingDomainSlugRef.current;
        if (!slug || domains.length === 0) return;
        const meta = domainBySlug(slug);
        pendingDomainSlugRef.current = null;
        if (meta) handleLobeClick(meta.order);
    }, [domains, handleLobeClick]);

    const activeDomainMeta = activeOrder ? domainByOrder(activeOrder) : undefined;
    const activeDomainInfo = activeDomainMeta ? domains.find((d) => d.domain === activeDomainMeta.key) : undefined;
    const activeBinary = activeDomainMeta ? DOMAINS[activeDomainMeta.key]?.binary : undefined;
    const noteCount = activeOrder ? graphs[activeOrder]?.nodes.length ?? 0 : 0;

    if (!settings) {
        return (
            <div className="flex min-h-screen items-center justify-center" style={{ color: 'var(--muted)' }}>
                Loading…
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full py-6 sm:py-10" style={{ background: 'var(--background)' }}>
            <WindowChrome
                addressPath={activeDomainMeta ? `aamodpaudel.com/${activeDomainMeta.slug}` : 'aamodpaudel.com'}
                canGoPrev={activeOrder !== null}
                canGoNext={activeOrder !== 5}
                onPrev={goPrev}
                onNext={goNext}
                theme={theme}
                onToggleTheme={toggleTheme}
                vscoUrl={settings.vscoUrl}
            >
                <div className="flex flex-col items-center gap-8 text-center">
                    <div>
                        <h1 className="text-4xl font-light sm:text-5xl">{settings.title}</h1>
                        {settings.tagline && (
                            <p className="mt-2 text-base" style={{ color: 'var(--muted)' }}>
                                {settings.tagline}
                            </p>
                        )}
                    </div>

                    {(settings.email || settings.githubUrl || settings.linkedinUrl || settings.twitterUrl) && (
                        <div className="flex flex-col items-center gap-3 border-b pb-6" style={{ borderColor: 'var(--border)' }}>
                            {settings.email && <span className="text-sm opacity-80">{settings.email}</span>}
                            <div className="flex flex-wrap justify-center gap-4">
                                {settings.githubUrl && (
                                    <a href={settings.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm opacity-70 hover:opacity-100">
                                        <Github size={16} /> GitHub
                                    </a>
                                )}
                                {settings.linkedinUrl && (
                                    <a href={settings.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm opacity-70 hover:opacity-100">
                                        <Linkedin size={16} /> LinkedIn
                                    </a>
                                )}
                                {settings.twitterUrl && (
                                    <a href={settings.twitterUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm opacity-70 hover:opacity-100">
                                        <Twitter size={16} /> X / Twitter
                                    </a>
                                )}
                            </div>
                        </div>
                    )}

                    {settings.bio && (
                        <div className="max-w-xl text-sm leading-relaxed">
                            <RichContent html={settings.bio} />
                        </div>
                    )}

                    {!activeOrder && (
                        <p className="text-xs italic opacity-60">
                            Click a region of the brain to wander into one of the five things I think about most.
                        </p>
                    )}

                    <div className="mt-6 flex w-full flex-col items-center gap-8">
                        <div className="flex w-full items-center justify-center gap-3 sm:gap-6">
                            <NavArrow direction="prev" disabled={activeOrder === null} onClick={goPrev} />
                            <div className="relative aspect-square w-full max-w-[360px] min-w-0">
                                <BrainCanvas activeOrder={activeOrder} onLobeClick={handleLobeClick} graphs={graphs} />
                            </div>
                            <NavArrow direction="next" disabled={activeOrder === 5} onClick={goNext} />
                        </div>

                        {activeDomainInfo && (
                            <div className="flex max-w-xl flex-col items-center gap-2">
                                <div className="flex items-center gap-2">
                                    {activeBinary && (
                                        <span
                                            className="rounded-full border px-1.5 py-0.5 font-mono text-[10px] tracking-wide opacity-60"
                                            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                                        >
                                            {activeBinary}
                                        </span>
                                    )}
                                    <h2 className="text-xl font-semibold">{activeDomainInfo.label}</h2>
                                </div>
                                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                                    {activeDomainInfo.tagline}
                                </p>
                                {activeDomainInfo.description && (
                                    <div className="mt-1 text-sm leading-relaxed">
                                        <RichContent html={activeDomainInfo.description} />
                                    </div>
                                )}
                            </div>
                        )}

                        {activeDomainMeta && (
                            <div className="flex w-full max-w-xl items-center justify-between text-sm">
                                <button onClick={resetToIdle} className="underline opacity-70 hover:opacity-100">
                                    ← Back to brain
                                </button>
                                <span style={{ color: 'var(--muted)' }}>
                                    {noteCount === 0
                                        ? 'No published notes yet'
                                        : `${noteCount} note${noteCount === 1 ? '' : 's'} — click one in the case to read it`}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </WindowChrome>
        </div>
    );
}
