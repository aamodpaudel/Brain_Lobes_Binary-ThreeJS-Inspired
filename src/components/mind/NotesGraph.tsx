'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ForceGraph2D from 'react-force-graph-2d';
import type { DomainKey } from '@/lib/domains';

interface GraphNode {
    id: number;
    name: string;
    slug: string;
    summary: string;
}

interface GraphEdge {
    source: number;
    target: number;
}

interface NotesGraphProps {
    domainKey: DomainKey;
    domainSlug: string;
    color: string;
    onBack: () => void;
}

export function NotesGraph({ domainKey, domainSlug, color, onBack }: NotesGraphProps) {
    const [data, setData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 320, height: 320 });
    const router = useRouter();

    useEffect(() => {
        fetch(`/api/notes/graph?domain=${domainKey}`)
            .then((res) => res.json())
            .then(setData)
            .catch(() => setData({ nodes: [], edges: [] }));
    }, [domainKey]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const observer = new ResizeObserver(([entry]) => {
            setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div className="flex w-full max-w-2xl flex-col gap-3">
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="text-sm underline opacity-70 hover:opacity-100">
                    ← Back
                </button>
                {data && (
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                        {data.nodes.length} note{data.nodes.length === 1 ? '' : 's'}
                    </span>
                )}
            </div>

            <div
                ref={containerRef}
                className="h-[60vh] min-h-[320px] w-full overflow-hidden rounded-xl border"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
            >
                {data && data.nodes.length === 0 && (
                    <div className="flex h-full items-center justify-center text-sm" style={{ color: 'var(--muted)' }}>
                        No published notes in this domain yet.
                    </div>
                )}
                {data && data.nodes.length > 0 && (
                    <ForceGraph2D
                        width={size.width}
                        height={size.height}
                        graphData={{ nodes: data.nodes, links: data.edges as unknown as { source: number; target: number }[] }}
                        nodeId="id"
                        nodeLabel="name"
                        nodeColor={() => color}
                        linkColor={() => 'rgba(150,150,150,0.5)'}
                        onNodeClick={(node: unknown) => {
                            const n = node as GraphNode;
                            router.push(`/mind/${domainSlug}/${n.slug}`);
                        }}
                        cooldownTicks={100}
                    />
                )}
            </div>
        </div>
    );
}
