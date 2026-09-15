'use client';

import { useEffect, useRef, useState } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import katex from 'katex';
import renderMathInElement from 'katex/dist/contrib/auto-render';
import 'katex/dist/katex.min.css';

// Quill stores &nbsp; for every space, which blocks word-wrap.
function fixNbsp(html: string): string {
    return html ? html.replace(/&nbsp;/gi, ' ') : '';
}

function sanitize(html: string): string {
    return DOMPurify.sanitize(fixNbsp(html), {
        ADD_ATTR: ['data-value', 'target'],
    });
}

/** Renders KaTeX for $...$/$$...$$ delimiters, raw LaTeX-looking text, and Quill .ql-formula blots inside a container. */
export function useKatexRender(containerRef: React.RefObject<HTMLElement | null>, deps: unknown[]) {
    useEffect(() => {
        const timer = setTimeout(() => {
            const container = containerRef.current;
            if (!container) return;

            renderMathInElement(container, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false },
                    { left: '\\[', right: '\\]', display: true },
                ],
                throwOnError: false,
            });

            const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
            let textNode: Node | null;
            const targets: { node: Text; text: string }[] = [];

            while ((textNode = walker.nextNode())) {
                const text = textNode.textContent || '';
                if (text.includes('\\') && (text.includes('_') || text.includes('^') || text.includes('\\frac') || text.includes('\\bar') || text.includes('\\sum'))) {
                    targets.push({ node: textNode as Text, text });
                }
            }

            targets.forEach(({ node, text }) => {
                if (node.parentNode && !(node.parentNode as HTMLElement).closest('.katex')) {
                    const span = document.createElement('span');
                    node.parentNode.replaceChild(span, node);
                    try {
                        katex.render(text.trim(), span, { throwOnError: false, displayMode: text.length > 50 });
                    } catch {
                        span.textContent = text;
                    }
                }
            });

            const formulas = container.querySelectorAll('.ql-formula');
            formulas.forEach((f) => {
                const tex = (f as HTMLElement).getAttribute('data-value');
                if (tex && !f.querySelector('.katex')) {
                    try {
                        katex.render(tex, f as HTMLElement, { throwOnError: false });
                    } catch {
                        /* leave raw text if KaTeX can't parse it */
                    }
                }
            });
        }, 50);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- deps is caller-supplied by design
    }, deps);
}

interface RichContentProps {
    html: string;
    className?: string;
}

/** Sanitizes and renders Quill-authored HTML, including KaTeX formulas and hyperlinks.
 *
 * Sanitizing only happens client-side, in an effect, even though this is already a "use
 * client" component — a page whose *server* component parent passes real data straight into
 * this on first render (note pages, unlike the home page's client-fetched data) still gets this
 * rendered as part of the server-side HTML pass, and isomorphic-dompurify's server-side path
 * runs through jsdom, which doesn't bundle cleanly for Vercel's serverless functions on
 * Next.js 16 ("Failed to load external module jsdom…", a known issue upstream). Never calling
 * sanitize() outside a client effect means jsdom is never invoked at all, sidestepping that
 * entirely rather than fighting the bundler config to make it work. */
export function RichContent({ html, className }: RichContentProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [sanitized, setSanitized] = useState<string | null>(null);

    useEffect(() => {
        setSanitized(sanitize(html));
    }, [html]);

    useKatexRender(ref, [sanitized]);

    return (
        <div
            ref={ref}
            className={`quill-content${className ? ` ${className}` : ''}`}
            {...(sanitized !== null ? { dangerouslySetInnerHTML: { __html: sanitized } } : {})}
        />
    );
}
