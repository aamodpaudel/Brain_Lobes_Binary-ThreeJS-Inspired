'use client';

import { useEffect, useRef } from 'react';
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

/** Sanitizes and renders Quill-authored HTML, including KaTeX formulas and hyperlinks. */
export function RichContent({ html, className }: RichContentProps) {
    const ref = useRef<HTMLDivElement>(null);
    useKatexRender(ref, [html]);

    return (
        <div
            ref={ref}
            className={`quill-content${className ? ` ${className}` : ''}`}
            dangerouslySetInnerHTML={{ __html: sanitize(html) }}
        />
    );
}
