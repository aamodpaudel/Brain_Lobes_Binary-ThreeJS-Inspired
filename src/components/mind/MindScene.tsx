'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Github, Linkedin, Twitter } from 'lucide-react';
import { RichContent } from '../RichContent';
import { BrainCanvas } from './BrainCanvas';
import type { DomainGraphData } from './MorphField';
import { WindowChrome, type AddressBarPage } from './WindowChrome';
import { useTheme } from '@/lib/useTheme';
import { DOMAIN_LIST, domainByOrder, domainBySlug, type DomainKey } from '@/lib/domains';

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
    instructionText: string;
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

    const router = useRouter();
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

    // Unlike handleLobeClick, never toggles off — clicking a lobe you've already selected is a
    // natural "deselect" gesture, but picking your *current* page from the address bar's
    // dropdown (or pressing Enter without typing anything) should just keep you there, the way
    // re-entering a browser's current URL doesn't navigate you away from it.
    const goToDomain = useCallback((order: number) => setActiveOrder(order), []);

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
    const noteCount = activeOrder ? graphs[activeOrder]?.nodes.length ?? 0 : 0;

    // Keep the browser's real address bar (not the in-app fake one) matching wherever you
    // actually are — previously nothing ever updated it after the initial load, so following a
    // note's "Back to <domain>" link (?domain=slug) left it stuck on that domain forever, even
    // after switching to a completely different one via the arrows or a lobe. Skipped while a
    // pending deep link hasn't been consumed yet, so this doesn't wipe out ?domain=... out from
    // under the effect above before it's had a chance to read it.
    const targetUrl = activeDomainMeta ? `/?domain=${activeDomainMeta.slug}` : '/';
    useEffect(() => {
        if (pendingDomainSlugRef.current) return;
        router.replace(targetUrl, { scroll: false });
    }, [targetUrl, router]);

    // The address bar's dropdown — every page this site actually has, not a raw URL field,
    // since typing an arbitrary path would have nowhere to go.
    const pageOptions: AddressBarPage[] = useMemo(
        () => [
            { path: 'aamodpaudel.com', label: settings?.title || 'Home', onSelect: resetToIdle },
            ...DOMAIN_LIST.map((meta) => ({
                path: `aamodpaudel.com/${meta.slug}`,
                label: domains.find((d) => d.domain === meta.key)?.label ?? meta.slug,
                onSelect: () => goToDomain(meta.order),
            })),
            // A real route (not part of the brain/domain state machine), so selecting it is an
            // actual navigation rather than an internal state change.
            { path: 'aamodpaudel.com/gallery', label: 'Gallery', onSelect: () => router.push('/gallery') },
        ],
        [settings, domains, resetToIdle, goToDomain, router],
    );

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
                pages={pageOptions}
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

                    {!activeOrder && settings.instructionText && (
                        <p className="text-xs italic opacity-60">{settings.instructionText}</p>
                    )}

                    <div className="mt-6 flex w-full flex-col items-center gap-8">
                        <div className="flex w-full items-center justify-center gap-3 sm:gap-6">
                            <NavArrow direction="prev" disabled={activeOrder === null} onClick={goPrev} />
                            <div className="relative aspect-square w-full max-w-[440px] min-w-0">
                                <BrainCanvas activeOrder={activeOrder} onLobeClick={handleLobeClick} graphs={graphs} />
                            </div>
                            <NavArrow direction="next" disabled={activeOrder === 5} onClick={goNext} />
                        </div>

                        {activeDomainInfo && (
                            <div className="flex max-w-xl flex-col items-center gap-2">
                                <h2 className="text-xl font-semibold">{activeDomainInfo.label}</h2>
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
