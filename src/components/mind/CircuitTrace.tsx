'use client';

import { useEffect, useRef, useState } from 'react';
import type { ProjectedPoint } from './BrainCanvas';

interface CircuitTraceProps {
    from: ProjectedPoint;
    to: ProjectedPoint;
    color: string;
    width: number;
    height: number;
}

function buildPath(from: ProjectedPoint, to: ProjectedPoint, offset: number): string {
    const midX = from.x + (to.x - from.x) * 0.5;
    return `M ${from.x + offset} ${from.y + offset} L ${midX + offset} ${from.y + offset} L ${midX + offset} ${to.y + offset} L ${to.x + offset} ${to.y + offset}`;
}

/** Draws a right-angle "PCB trace" — a double parallel line, like a circuit board track — from a
 * projected brain-lobe point across to the domain box. */
export function CircuitTrace({ from, to, color, width, height }: CircuitTraceProps) {
    const pathRef = useRef<SVGPathElement>(null);
    const path2Ref = useRef<SVGPathElement>(null);
    const [drawn, setDrawn] = useState(false);

    const d1 = buildPath(from, to, -1.5);
    const d2 = buildPath(from, to, 1.5);

    useEffect(() => {
        const path = pathRef.current;
        const path2 = path2Ref.current;
        if (!path || !path2) return;
        const length = path.getTotalLength();
        [path, path2].forEach((p) => {
            p.style.transition = 'none';
            p.style.strokeDasharray = `${length}`;
            p.style.strokeDashoffset = `${length}`;
        });
        // Resets the end-dot's visibility for this new draw cycle (from/to changed) before
        // the rAF below starts the stroke animation — an imperative reset tied to props, not derived state.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDrawn(false);
        const raf = requestAnimationFrame(() => {
            [path, path2].forEach((p) => {
                p.style.transition = 'stroke-dashoffset 0.6s ease-out';
                p.style.strokeDashoffset = '0';
            });
            setDrawn(true);
        });
        return () => cancelAnimationFrame(raf);
    }, [from.x, from.y, to.x, to.y]);

    return (
        <svg
            width={width}
            height={height}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}
        >
            <path ref={pathRef} d={d1} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
            <path ref={path2Ref} d={d2} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" opacity={0.6} />
            <circle cx={from.x} cy={from.y} r={3.5} fill={color} />
            <circle
                cx={to.x}
                cy={to.y}
                r={3.5}
                fill={color}
                style={{ opacity: drawn ? 1 : 0, transition: 'opacity 0.2s ease-out 0.4s' }}
            />
        </svg>
    );
}
