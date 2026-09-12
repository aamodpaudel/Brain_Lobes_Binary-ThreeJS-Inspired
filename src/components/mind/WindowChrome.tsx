'use client';

import { ChevronLeft, ChevronRight, Sun, Moon, Camera, Search } from 'lucide-react';

interface WindowChromeProps {
    addressPath: string;
    canGoPrev: boolean;
    canGoNext: boolean;
    onPrev: () => void;
    onNext: () => void;
    theme: 'light' | 'dark';
    onToggleTheme: () => void;
    vscoUrl?: string | null;
    children: React.ReactNode;
}

/** The macOS/Safari-style glass window the whole site lives inside. */
export function WindowChrome({
    addressPath,
    canGoPrev,
    canGoNext,
    onPrev,
    onNext,
    theme,
    onToggleTheme,
    vscoUrl,
    children,
}: WindowChromeProps) {
    return (
        <div
            className="relative z-10 mx-auto flex w-full max-w-5xl flex-col overflow-hidden rounded-xl border shadow-lg backdrop-blur-2xl"
            style={{ borderColor: 'var(--glass-border)', backgroundColor: 'var(--glass-bg)' }}
        >
            <div
                className="flex h-12 shrink-0 items-center gap-4 border-b px-4 backdrop-blur-md"
                style={{ borderColor: 'var(--glass-border)', backgroundColor: 'var(--glass-topbar-bg)' }}
            >
                <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: 'var(--traffic-dot)' }} />
                    <span className="h-3 w-3 rounded-full opacity-70" style={{ backgroundColor: 'var(--traffic-dot)' }} />
                    <span className="h-3 w-3 rounded-full opacity-40" style={{ backgroundColor: 'var(--traffic-dot)' }} />
                </div>

                <div className="flex items-center overflow-hidden rounded-md border" style={{ borderColor: 'var(--border)' }}>
                    <button
                        onClick={onPrev}
                        disabled={!canGoPrev}
                        aria-label="Previous domain"
                        className="flex h-6 w-6 items-center justify-center border-r disabled:opacity-30"
                        style={{ borderColor: 'var(--border)' }}
                    >
                        <ChevronLeft size={14} />
                    </button>
                    <button
                        onClick={onNext}
                        disabled={!canGoNext}
                        aria-label="Next domain"
                        className="flex h-6 w-6 items-center justify-center disabled:opacity-30"
                    >
                        <ChevronRight size={14} />
                    </button>
                </div>

                <button onClick={onToggleTheme} aria-label="Toggle theme" className="opacity-70 hover:opacity-100">
                    {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
                </button>

                <div
                    className="mx-auto flex h-6 w-full max-w-xs items-center justify-center gap-1.5 rounded-md border text-[11px] opacity-70"
                    style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
                >
                    <Search size={11} />
                    <span>{addressPath}</span>
                </div>

                <div className="ml-auto flex items-center gap-4">
                    {vscoUrl && (
                        <a
                            href={vscoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Photography on VSCO"
                            className="opacity-70 hover:opacity-100"
                        >
                            <Camera size={16} />
                        </a>
                    )}
                    <a href="/admin" className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold opacity-70 hover:opacity-100" style={{ borderColor: 'var(--border)' }}>
                        Admin
                    </a>
                </div>
            </div>

            <div className="px-4 py-8 sm:px-10 sm:py-10">{children}</div>
        </div>
    );
}
