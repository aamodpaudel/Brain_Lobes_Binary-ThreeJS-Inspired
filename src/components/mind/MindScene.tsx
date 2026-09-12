'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Github, Linkedin, Twitter } from 'lucide-react';
import { RichContent } from '../RichContent';
import { BrainCanvas, type ProjectedPoint } from './BrainCanvas';
import { CircuitTrace } from './CircuitTrace';
import { DomainBox, type DomainInfoData } from './DomainBox';
import { WindowChrome } from './WindowChrome';
import { useTheme } from '@/lib/useTheme';
import { domainByOrder, domainBySlug } from '@/lib/domains';

const NotesGraph = dynamic(() => import('./NotesGraph').then((m) => m.NotesGraph), { ssr: false });

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

const CIRCUIT_REVEAL_DELAY = 550; // matches CircuitTrace's draw-in duration

export function MindScene() {
    const { theme, toggleTheme } = useTheme();
    const [settings, setSettings] = useState<GlobalSettingsData | null>(null);
    const [domains, setDomains] = useState<DomainInfoData[]>([]);
    const [activeOrder, setActiveOrder] = useState<number | null>(null);
    const [circuit, setCircuit] = useState<{ from: ProjectedPoint; to: ProjectedPoint } | null>(null);
    const [showBox, setShowBox] = useState(false);
    const [graphOpen, setGraphOpen] = useState(false);
    const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

    const stageRef = useRef<HTMLDivElement>(null);
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const domainBoxWrapperRef = useRef<HTMLDivElement>(null);
    const searchParams = useSearchParams();
    const autoOpenGraphRef = useRef(false);
    const pendingDomainSlugRef = useRef<string | null>(searchParams.get('domain'));

    useEffect(() => {
        Promise.all([
            fetch('/api/settings').then((r) => r.json()),
            fetch('/api/domains').then((r) => r.json()),
        ]).then(([s, d]) => {
            setSettings(s);
            setDomains(d);
        });
    }, []);

    useEffect(() => {
        // stageRef isn't attached yet on the very first render (settings is still loading, so
        // this component returns the "Loading…" placeholder instead of the real stage div) —
        // re-run once settings arrives and the ref actually points at a mounted element.
        const el = stageRef.current;
        if (!el) return;
        const observer = new ResizeObserver(([entry]) => {
            setStageSize({ width: entry.contentRect.width, height: entry.contentRect.height });
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [settings]);

    const resetToIdle = useCallback(() => {
        setActiveOrder(null);
        setCircuit(null);
        setShowBox(false);
        setGraphOpen(false);
    }, []);

    const handleLobeClick = useCallback(
        (order: number | null) => {
            if (order == null) {
                resetToIdle();
                return;
            }
            setActiveOrder((prev) => {
                if (prev === order) {
                    resetToIdle();
                    return null;
                }
                setCircuit(null);
                setShowBox(false);
                setGraphOpen(false);
                return order;
            });
        },
        [resetToIdle],
    );

    const handleSocketProjected = useCallback((order: number, point: ProjectedPoint) => {
        const canvasEl = canvasContainerRef.current;
        const boxEl = domainBoxWrapperRef.current;
        if (!canvasEl || !boxEl) return;

        const from = { x: point.x + canvasEl.offsetLeft, y: point.y + canvasEl.offsetTop };
        // Measured from the domain box's own (invisible-until-shown) wrapper, not a guessed
        // placeholder — flex `gap` sits between elements, so a separate zero-size anchor div
        // ends up offset from the box's real edge by a whole gap-width.
        const to = { x: boxEl.offsetLeft, y: boxEl.offsetTop + boxEl.offsetHeight / 2 };

        setCircuit({ from, to });
        setTimeout(() => {
            setShowBox(true);
            if (autoOpenGraphRef.current) {
                autoOpenGraphRef.current = false;
                setGraphOpen(true);
            }
        }, CIRCUIT_REVEAL_DELAY);
    }, []);

    // Deep-link support: a note page's "Back to <domain>" link passes ?domain=<slug>
    // so returning here reopens that domain's graph instead of landing on the idle brain.
    useEffect(() => {
        const slug = pendingDomainSlugRef.current;
        if (!slug || domains.length === 0) return;
        const meta = domainBySlug(slug);
        pendingDomainSlugRef.current = null;
        if (meta) {
            autoOpenGraphRef.current = true;
            handleLobeClick(meta.order);
        }
    }, [domains, handleLobeClick]);

    const activeDomainMeta = activeOrder ? domainByOrder(activeOrder) : undefined;
    const activeDomainInfo = activeDomainMeta ? domains.find((d) => d.domain === activeDomainMeta.key) : undefined;

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
                onPrev={() => handleLobeClick(activeOrder === null ? null : activeOrder === 1 ? null : activeOrder - 1)}
                onNext={() => handleLobeClick(activeOrder === null ? 1 : activeOrder + 1)}
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

                    <div
                        ref={stageRef}
                        className="relative flex w-full flex-col items-center gap-6 lg:flex-row lg:items-center lg:justify-center"
                    >
                        <div ref={canvasContainerRef} className="relative aspect-square w-full max-w-[300px] shrink-0">
                            <BrainCanvas
                                activeOrder={activeOrder}
                                onLobeClick={handleLobeClick}
                                onSocketProjected={handleSocketProjected}
                                containerRef={canvasContainerRef}
                            />
                        </div>

                        {circuit && stageSize.width > 0 && (
                            <CircuitTrace
                                from={circuit.from}
                                to={circuit.to}
                                color={activeDomainInfo?.colorHex ?? 'var(--accent)'}
                                width={stageSize.width}
                                height={stageSize.height}
                            />
                        )}

                        {activeDomainInfo && (
                            <div
                                ref={domainBoxWrapperRef}
                                style={{
                                    opacity: showBox ? 1 : 0,
                                    pointerEvents: showBox ? 'auto' : 'none',
                                    transition: 'opacity 0.3s ease-out',
                                }}
                            >
                                <DomainBox info={activeDomainInfo} onExplore={() => setGraphOpen((g) => !g)} onClose={resetToIdle} exploring={graphOpen} />
                            </div>
                        )}

                        {graphOpen && activeDomainMeta && (
                            <NotesGraph
                                domainKey={activeDomainMeta.key}
                                domainSlug={activeDomainMeta.slug}
                                color={activeDomainInfo?.colorHex ?? 'var(--accent)'}
                                onBack={() => setGraphOpen(false)}
                            />
                        )}
                    </div>
                </div>
            </WindowChrome>
        </div>
    );
}
