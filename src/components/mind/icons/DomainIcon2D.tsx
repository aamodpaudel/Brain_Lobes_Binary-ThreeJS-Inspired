'use client';

import type { DomainKey } from '@/lib/domains';

// Lightweight animated SVG/CSS icons — deliberately not WebGL. A second live <Canvas>
// mounted alongside the main brain scene reliably triggered "THREE.WebGLRenderer: Context
// Lost" in testing, silently blanking the brain. These give each domain a distinct animated
// visual without touching the GPU context the brain canvas depends on.

function PiIcon({ color }: { color: string }) {
    return (
        <div className="flex h-28 w-28 items-center justify-center">
            <span
                className="text-6xl font-serif"
                style={{ color, display: 'inline-block', animation: 'mind-spin-y 4s linear infinite' }}
            >
                π
            </span>
        </div>
    );
}

function PendulumIcon({ color }: { color: string }) {
    return (
        <div className="flex h-28 w-28 items-center justify-center">
            <svg width="80" height="96" viewBox="0 0 80 96">
                <g style={{ transformOrigin: '40px 8px', animation: 'mind-swing 1.8s ease-in-out infinite' }}>
                    <line x1="40" y1="8" x2="40" y2="55" stroke={color} strokeWidth="2" />
                    <circle cx="40" cy="65" r="10" fill={color} />
                </g>
                <circle cx="40" cy="8" r="3" fill={color} />
            </svg>
        </div>
    );
}

function NeuronIcon({ color }: { color: string }) {
    return (
        <div className="flex h-28 w-28 items-center justify-center">
            <svg width="96" height="72" viewBox="0 0 96 72">
                <circle cx="16" cy="20" r="10" fill={color} />
                <path d="M 24 24 Q 48 10 72 40" stroke={color} strokeWidth="2" fill="none" opacity={0.5} />
                <circle r="4" fill={color}>
                    <animateMotion dur="2s" repeatCount="indefinite" path="M 24 24 Q 48 10 72 40" />
                </circle>
            </svg>
        </div>
    );
}

function BlobIcon({ color }: { color: string }) {
    return (
        <div className="flex h-28 w-28 items-center justify-center">
            <div
                className="h-20 w-20"
                style={{ backgroundColor: color, animation: 'mind-morph 4s ease-in-out infinite' }}
            />
        </div>
    );
}

const NETWORK_LAYERS: [number, number[]][] = [
    [16, [16, 40, 64]],
    [48, [8, 40, 72]],
    [80, [24, 56]],
];

function NetworkIcon({ color }: { color: string }) {
    const edges: [number, number, number, number][] = [];
    for (let l = 0; l < NETWORK_LAYERS.length - 1; l++) {
        const [x1, ys1] = NETWORK_LAYERS[l];
        const [x2, ys2] = NETWORK_LAYERS[l + 1];
        for (const y1 of ys1) for (const y2 of ys2) edges.push([x1, y1, x2, y2]);
    }

    return (
        <div className="flex h-28 w-28 items-center justify-center">
            <svg width="96" height="80" viewBox="0 0 96 80">
                {edges.map(([x1, y1, x2, y2], i) => (
                    <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1" opacity={0.3} />
                ))}
                {NETWORK_LAYERS.flatMap(([x, ys]) => ys.map((y) => [x, y]))
                    .map(([x, y], i) => (
                        <circle key={i} cx={x} cy={y} r={5} fill={color} />
                    ))}
                <circle r="4" fill="white" stroke={color} strokeWidth="2">
                    <animateMotion dur="2.4s" repeatCount="indefinite" path="M 16,40 L 48,40 L 80,40" />
                </circle>
            </svg>
        </div>
    );
}

const ICONS: Record<DomainKey, React.ComponentType<{ color: string }>> = {
    PURE_MATHEMATICS: PiIcon,
    THEORETICAL_PHYSICS: PendulumIcon,
    COMPUTATIONAL_NEUROSCIENCE: NeuronIcon,
    PHILOSOPHY_LIFE: BlobIcon,
    APPLIED_AI: NetworkIcon,
};

export function DomainIcon2D({ domain, color }: { domain: DomainKey; color: string }) {
    const Icon = ICONS[domain];
    return (
        <>
            <style>{`
                @keyframes mind-spin-y { from { transform: rotateY(0deg); } to { transform: rotateY(360deg); } }
                @keyframes mind-swing { 0%, 100% { transform: rotate(-28deg); } 50% { transform: rotate(28deg); } }
                @keyframes mind-morph {
                    0%, 100% { border-radius: 42% 58% 65% 35% / 45% 45% 55% 55%; }
                    50% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
                }
            `}</style>
            <Icon color={color} />
        </>
    );
}
