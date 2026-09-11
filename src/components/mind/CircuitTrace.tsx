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

/** Draws a right-angle "PCB trace" style path from a projected brain-lobe point down to the domain box. */
export function CircuitTrace({ from, to, color, width, height }: CircuitTraceProps) {
    const pathRef = useRef<SVGPathElement>(null);
    const [drawn, setDrawn] = useState(false);

    const midY = from.y + (to.y - from.y) * 0.5;
    const d = `M ${from.x} ${from.y} L ${from.x} ${midY} L ${to.x} ${midY} L ${to.x} ${to.y}`;

    useEffect(() => {
        const path = pathRef.current;
        if (!path) return;
        const length = path.getTotalLength();
        path.style.transition = 'none';
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = `${length}`;
        setDrawn(false);
        const raf = requestAnimationFrame(() => {
            path.style.transition = 'stroke-dashoffset 0.6s ease-out';
            path.style.strokeDashoffset = '0';
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
            <path ref={pathRef} d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
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
