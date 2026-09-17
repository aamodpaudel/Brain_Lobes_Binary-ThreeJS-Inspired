'use client';

import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Sun, Moon, Camera, Images, Search } from 'lucide-react';

export interface AddressBarPage {
    /** Full display path, e.g. "aamodpaudel.com/pure-mathematics" */
    path: string;
    label: string;
    onSelect: () => void;
}

interface WindowChromeProps {
    addressPath: string;
    pages: AddressBarPage[];
    canGoPrev: boolean;
    canGoNext: boolean;
    onPrev: () => void;
    onNext: () => void;
    theme: 'light' | 'dark';
    onToggleTheme: () => void;
    vscoUrl?: string | null;
    children: React.ReactNode;
}

/** A real, editable address bar — but scoped to this site's own pages rather than a raw URL
 * field, since there's nowhere else to navigate to. Click it to see every page (home + each
 * domain), type to filter the list, or press Enter on an exact match. */
function AddressBar({ addressPath, pages }: { addressPath: string; pages: AddressBarPage[] }) {
    const [open, setOpen] = useState(false);
    // null until the user actually types something — the field still displays `addressPath`
    // while it's null (derived during render, no separate copy to keep in sync via an effect),
    // but the dropdown shows every page instead of filtering. Focusing alone used to seed this
    // with the full current path, which made the list self-filter down to just the page you
    // were already on — the one thing worth navigating *to* never showed up.
    const [draft, setDraft] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const text = draft ?? addressPath;
    const query = draft?.toLowerCase().trim() ?? '';
    const filtered = draft === null ? pages : pages.filter((p) => p.path.toLowerCase().includes(query) || p.label.toLowerCase().includes(query));

    const choose = (page: AddressBarPage) => {
        page.onSelect();
        setDraft(null);
        setOpen(false);
        inputRef.current?.blur();
    };

    return (
        <div className="relative min-w-0 flex-1 sm:mx-auto sm:max-w-xs sm:flex-initial">
            <div
                className="flex h-6 w-full items-center gap-1.5 rounded-md border px-2 text-[11px]"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
            >
                <Search size={11} className="shrink-0 opacity-70" />
                <input
                    ref={inputRef}
                    value={text}
                    onFocus={(e) => {
                        setOpen(true);
                        e.target.select();
                    }}
                    onBlur={() => {
                        setDraft(null);
                        setOpen(false);
                    }}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            const exact = pages.find((p) => p.path.toLowerCase() === text.toLowerCase().trim());
                            if (exact) choose(exact);
                            else if (filtered.length === 1) choose(filtered[0]);
                        } else if (e.key === 'Escape') {
                            setDraft(null);
                            inputRef.current?.blur();
                        }
                    }}
                    className="w-full min-w-0 bg-transparent text-center opacity-80 outline-none"
                    aria-label="Go to page"
                />
            </div>

            {open && filtered.length > 0 && (
                <ul
                    className="absolute left-1/2 top-[calc(100%+4px)] z-20 max-h-56 w-56 max-w-[calc(100vw-2rem)] -translate-x-1/2 overflow-y-auto rounded-md border py-1 text-left text-xs shadow-lg"
                    style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
                >
                    {filtered.map((p) => (
                        <li key={p.path}>
                            {/* onMouseDown (not onClick) fires before the input's onBlur closes the list */}
                            <button
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    choose(p);
                                }}
                                className="flex w-full flex-col px-3 py-1.5 text-left hover:opacity-100"
                                style={{ opacity: p.path === addressPath ? 1 : 0.75 }}
                            >
                                <span className="font-medium">{p.label}</span>
                                <span className="text-[10px] opacity-60">{p.path}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/** The macOS/Safari-style glass window the whole site lives inside. */
export function WindowChrome({
    addressPath,
    pages,
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
                className="flex h-14 shrink-0 items-center gap-1.5 border-b px-3 backdrop-blur-md sm:h-12 sm:gap-4 sm:px-4"
                style={{ borderColor: 'var(--glass-border)', backgroundColor: 'var(--glass-topbar-bg)' }}
            >
                <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: '#ff5f57' }} />
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: '#febc2e' }} />
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: '#28c840' }} />
                </div>

                <div className="flex shrink-0 items-center overflow-hidden rounded-md border" style={{ borderColor: 'var(--border)' }}>
                    <button
                        onClick={onPrev}
                        disabled={!canGoPrev}
                        aria-label="Previous domain"
                        className="flex h-6 w-6 items-center justify-center border-r disabled:opacity-30 sm:h-7 sm:w-7"
                        style={{ borderColor: 'var(--border)' }}
                    >
                        <ChevronLeft size={14} />
                    </button>
                    <button
                        onClick={onNext}
                        disabled={!canGoNext}
                        aria-label="Next domain"
                        className="flex h-6 w-6 items-center justify-center disabled:opacity-30 sm:h-7 sm:w-7"
                    >
                        <ChevronRight size={14} />
                    </button>
                </div>

                <button onClick={onToggleTheme} aria-label="Toggle theme" className="hidden shrink-0 p-1 opacity-70 hover:opacity-100 sm:inline-flex">
                    {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
                </button>

                <AddressBar addressPath={addressPath} pages={pages} />

                <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-4">
                    {vscoUrl && (
                        <a
                            href={vscoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Photography on VSCO"
                            className="hidden p-1 opacity-70 hover:opacity-100 sm:inline-flex"
                        >
                            <Camera size={16} />
                        </a>
                    )}
                    <a href="/gallery" aria-label="Photo gallery" className="p-0.5 opacity-70 hover:opacity-100 sm:p-1">
                        <Images size={16} />
                    </a>
                    <a
                        href="/admin"
                        className="whitespace-nowrap rounded-full border px-2 py-1 text-[11px] font-semibold opacity-70 hover:opacity-100 sm:px-2.5"
                        style={{ borderColor: 'var(--border)' }}
                    >
                        Admin
                    </a>
                </div>
            </div>

            <div className="px-4 py-8 sm:px-10 sm:py-10">{children}</div>
        </div>
    );
}
