'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Github, Linkedin, Twitter, Camera, Sun, Moon } from 'lucide-react';
import { CircuitBackground } from '../CircuitBackground';
import { RichContent } from '../RichContent';
import { BrainCanvas, type ProjectedPoint } from './BrainCanvas';
import { CircuitTrace } from './CircuitTrace';
import { DomainBox, type DomainInfoData } from './DomainBox';
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
    const anchorRef = useRef<HTMLDivElement>(null);
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
        const el = stageRef.current;
        if (!el) return;
        const observer = new ResizeObserver(([entry]) => {
            setStageSize({ width: entry.contentRect.width, height: entry.contentRect.height });
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

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
        const anchorEl = anchorRef.current;
        if (!canvasEl || !anchorEl) return;

        const from = { x: point.x + canvasEl.offsetLeft, y: point.y + canvasEl.offsetTop };
        const to = { x: anchorEl.offsetLeft + anchorEl.offsetWidth / 2, y: anchorEl.offsetTop };

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
        <div className="relative min-h-screen w-full" style={{ background: 'var(--background)' }}>
            <CircuitBackground />
            <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-8 px-4 py-6 sm:px-8 sm:py-10">
                <header className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-medium tracking-wide opacity-60">aamodpaudel.com</span>
                    <div className="flex items-center gap-4">
                        {settings.vscoUrl && (
                            <a
                                href={settings.vscoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Photography on VSCO"
                                className="opacity-70 hover:opacity-100"
                            >
                                <Camera size={18} />
                            </a>
                        )}
                        <button onClick={toggleTheme} aria-label="Toggle theme" className="opacity-70 hover:opacity-100">
                            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                        </button>
                        <a href="/admin" className="text-xs font-semibold opacity-60 hover:opacity-100">
                            Admin
                        </a>
                    </div>
                </header>

                <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-start lg:justify-between">
                    <div className="w-full max-w-lg text-center lg:text-left">
                        <h1 className="text-4xl font-light sm:text-5xl">{settings.title}</h1>
                        {settings.tagline && (
                            <p className="mt-2 text-base" style={{ color: 'var(--muted)' }}>
                                {settings.tagline}
                            </p>
                        )}

                        <div
                            className="mt-4 flex flex-col items-center gap-3 border-b pb-5 lg:items-start"
                            style={{ borderColor: 'var(--border)' }}
                        >
                            {settings.email && <span className="text-sm opacity-80">{settings.email}</span>}
                            {(settings.githubUrl || settings.linkedinUrl || settings.twitterUrl) && (
                                <div className="flex flex-wrap justify-center gap-4 lg:justify-start">
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
                            )}
                        </div>

                        {settings.bio && (
                            <div className="mt-5 text-sm leading-relaxed">
                                <RichContent html={settings.bio} />
                            </div>
                        )}

                        {!activeOrder && (
                            <p className="mt-5 text-xs italic opacity-60">
                                Click a region of the brain to wander into one of the five things I think about most.
                            </p>
                        )}
                    </div>

                    <div ref={stageRef} className="relative flex w-full flex-col items-center gap-4 lg:w-[380px]">
                        <div ref={canvasContainerRef} className="relative aspect-square w-full max-w-[340px]">
                            <BrainCanvas
                                activeOrder={activeOrder}
                                onLobeClick={handleLobeClick}
                                onSocketProjected={handleSocketProjected}
                                containerRef={canvasContainerRef}
                            />
                        </div>

                        <div ref={anchorRef} className="h-0 w-1" />

                        {circuit && stageSize.width > 0 && (
                            <CircuitTrace
                                from={circuit.from}
                                to={circuit.to}
                                color={activeDomainInfo?.colorHex ?? 'var(--accent)'}
                                width={stageSize.width}
                                height={stageSize.height}
                            />
                        )}

                        {showBox && activeDomainInfo && !graphOpen && (
                            <DomainBox info={activeDomainInfo} onExplore={() => setGraphOpen(true)} onClose={resetToIdle} />
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
            </div>
        </div>
    );
}
