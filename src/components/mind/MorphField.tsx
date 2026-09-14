'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Html, Line } from '@react-three/drei';
import { useRouter } from 'next/navigation';
import * as THREE from 'three';
import { BrainModel } from '../BrainModel';
import { sampleBrainParticles, layoutGraphIn3D, assignParticlesToNodes } from './particles';

/** A soft, antialiased circular sprite for each particle — the default PointsMaterial has no
 * texture, so every dot renders as a hard-edged square that looks blocky/pixelated the moment
 * you zoom in. Built once on a small offscreen canvas and shared by every instance. */
function useDotTexture(): THREE.Texture {
    return useMemo(() => {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.35, 'rgba(255,255,255,0.85)');
        gradient.addColorStop(0.7, 'rgba(255,255,255,0.28)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        const texture = new THREE.CanvasTexture(canvas);
        // Mipmapping a small, high-contrast radial gradient like this one is what was producing
        // a hollow ring instead of a solid dot at the small on-screen sizes distance-attenuation
        // shrinks these to — the box-filtered lower mip levels don't preserve the gradient shape
        // cleanly. Plain bilinear sampling of the full-res texture doesn't have that problem.
        texture.generateMipmaps = false;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
        return texture;
    }, []);
}

export interface GraphNoteNode {
    id: number;
    name: string;
    slug: string;
    summary: string;
}

export interface GraphNoteEdge {
    source: number;
    target: number;
}

export interface DomainGraphData {
    nodes: GraphNoteNode[];
    edges: GraphNoteEdge[];
    domainSlug: string;
    colorHex: string;
}

const PARTICLE_TARGET = 260;
const MORPH_DURATION = 900; // ms
const SCATTER_RADIUS = 0.55;
const NEUTRAL_COLOR = new THREE.Color('#9a9a9a');
const NOTE_RADIUS = 0.0675;

interface GLTFNodes {
    [key: string]: THREE.Mesh;
}

interface DomainScene {
    positions: Float32Array;
    edgePoints: Float32Array;
    nodePositions: { id: number; name: string; slug: string; pos: THREE.Vector3 }[];
    color: THREE.Color;
    domainSlug: string;
}

function easeInOutCubic(t: number) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** The case's contents. Idle shows the real brain mesh; selecting a domain dissolves it into a
 * scatter of particles that reform as that domain's actual notes graph — real nodes, real edges,
 * clickable — laid out and colored to match, right inside the case. Reverses the same way going
 * back to idle. (The case's own slow idle sway lives one level up, in BrainCanvas — it wraps
 * this whole component so the brain and the notes particles both drift with it for free.) */
export function MorphField({
    activeOrder,
    onLobeClick,
    graphs,
}: {
    activeOrder: number | null;
    onLobeClick: (order: number | null) => void;
    graphs: Partial<Record<number, DomainGraphData>>;
}) {
    const router = useRouter();
    const dotTexture = useDotTexture();
    const { nodes } = useGLTF('/brain2.glb') as unknown as { nodes: GLTFNodes };
    const brainPositions = useMemo(() => sampleBrainParticles(nodes, PARTICLE_TARGET), [nodes]);
    const particleCount = brainPositions ? brainPositions.length / 3 : 0;

    const sceneCache = useRef(new Map<number, DomainScene>());
    const getScene = (order: number): DomainScene | null => {
        const cached = sceneCache.current.get(order);
        if (cached) return cached;
        const graph = graphs[order];
        if (!graph || !particleCount) return null;

        const layout = layoutGraphIn3D(graph.nodes, graph.edges);
        const ids = graph.nodes.map((n) => n.id);
        const positions = assignParticlesToNodes(ids, layout, particleCount);

        const edgePoints: number[] = [];
        for (const e of graph.edges) {
            const a = layout.get(e.source);
            const b = layout.get(e.target);
            if (a && b) edgePoints.push(a.x, a.y, a.z, b.x, b.y, b.z);
        }

        const scene: DomainScene = {
            positions,
            edgePoints: new Float32Array(edgePoints),
            nodePositions: graph.nodes
                .map((n) => ({ id: n.id, name: n.name, slug: n.slug, pos: layout.get(n.id) }))
                .filter((n): n is { id: number; name: string; slug: string; pos: THREE.Vector3 } => !!n.pos),
            color: new THREE.Color(graph.colorHex || '#9a9a9a'),
            domainSlug: graph.domainSlug,
        };
        sceneCache.current.set(order, scene);
        return scene;
    };

    const targetFor = (order: number | null): Float32Array | null =>
        order == null ? brainPositions : getScene(order)?.positions ?? null;
    const colorFor = (order: number | null): THREE.Color => (order == null ? NEUTRAL_COLOR : getScene(order)?.color ?? NEUTRAL_COLOR);

    const [displayOrder, setDisplayOrder] = useState<number | null>(null);
    const [morphing, setMorphing] = useState(false);
    const [hoveredNote, setHoveredNote] = useState<number | null>(null);

    const pointsRef = useRef<THREE.Points>(null);
    const materialRef = useRef<THREE.PointsMaterial>(null);

    const fromRef = useRef<Float32Array | null>(null);
    const toRef = useRef<Float32Array | null>(null);
    const currentRef = useRef<Float32Array | null>(null);
    const jitterDirsRef = useRef<Float32Array | null>(null);
    const fromColorRef = useRef(NEUTRAL_COLOR.clone());
    const toColorRef = useRef(NEUTRAL_COLOR.clone());
    const startTimeRef = useRef(0);

    // `undefined` means "we've never had real particle data yet". Kept as one effect (rather
    // than a separate "seed once particleCount is ready" effect plus a "skip the very first
    // activeOrder change" effect) because that split had a real bug: the skip fired at mount
    // regardless of whether particleCount was ready yet, so a click that landed on the same
    // render pass as particleCount going from 0 → real (brain2.glb still loading, or a fresh
    // mount right after a deep link) got silently swallowed — nothing animated in until a
    // second, unrelated activeOrder change came along to "unstick" it.
    const lastSyncedOrderRef = useRef<number | null | undefined>(undefined);
    useEffect(() => {
        if (!particleCount) return;

        if (lastSyncedOrderRef.current === undefined) {
            // First time we actually have geometry to show. Snap straight to whatever
            // `activeOrder` already is — no animation — so this never shows an empty box.
            currentRef.current = new Float32Array(targetFor(activeOrder) ?? new Float32Array(particleCount * 3));
            lastSyncedOrderRef.current = activeOrder;
            setDisplayOrder(activeOrder);
            // Not materialRef.current.color here — the material hasn't mounted yet on this very
            // first sync (its JSX only renders once `displayOrder` goes non-null, which this
            // triggers). The `color` prop below reads reactively off `displayOrder` instead, so
            // it's correct the instant the material does mount.

            const dirs = new Float32Array(particleCount * 3);
            for (let i = 0; i < particleCount; i++) {
                const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
                dirs[i * 3] = v.x;
                dirs[i * 3 + 1] = v.y;
                dirs[i * 3 + 2] = v.z;
            }
            jitterDirsRef.current = dirs;
            return;
        }

        if (lastSyncedOrderRef.current === activeOrder) return; // nothing actually changed
        lastSyncedOrderRef.current = activeOrder;
        if (!currentRef.current) return;

        fromRef.current = currentRef.current.slice();
        toRef.current = targetFor(activeOrder);
        fromColorRef.current = (materialRef.current?.color ?? colorFor(displayOrder)).clone();
        toColorRef.current = colorFor(activeOrder).clone();
        startTimeRef.current = performance.now();
        setMorphing(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeOrder, particleCount]);

    // Clicking a note cluster navigates away (router.push) while the pointer is still hovering
    // it — the page changes before onPointerOut ever gets a chance to fire, so without this the
    // hand cursor set below stays stuck on document.body through the note page and back.
    useEffect(() => {
        return () => {
            document.body.style.cursor = 'auto';
        };
    }, []);

    useFrame(() => {
        if (!morphing || !fromRef.current || !toRef.current || !currentRef.current) return;
        const pts = pointsRef.current;
        if (!pts) return;

        const t = Math.min(1, (performance.now() - startTimeRef.current) / MORPH_DURATION);
        const eased = easeInOutCubic(t);
        const scatter = Math.sin(t * Math.PI) * SCATTER_RADIUS;

        const from = fromRef.current;
        const to = toRef.current;
        const cur = currentRef.current;
        const dirs = jitterDirsRef.current;

        for (let i = 0; i < particleCount; i++) {
            const ix = i * 3;
            const lx = THREE.MathUtils.lerp(from[ix], to[ix], eased);
            const ly = THREE.MathUtils.lerp(from[ix + 1], to[ix + 1], eased);
            const lz = THREE.MathUtils.lerp(from[ix + 2], to[ix + 2], eased);
            cur[ix] = lx + (dirs ? dirs[ix] * scatter : 0);
            cur[ix + 1] = ly + (dirs ? dirs[ix + 1] * scatter : 0);
            cur[ix + 2] = lz + (dirs ? dirs[ix + 2] * scatter : 0);
        }

        const attr = pts.geometry.attributes.position as THREE.BufferAttribute;
        (attr.array as Float32Array).set(cur);
        attr.needsUpdate = true;
        pts.geometry.computeBoundingSphere();

        if (materialRef.current) {
            materialRef.current.color.copy(fromColorRef.current).lerp(toColorRef.current, eased);
        }

        if (t >= 1) {
            setMorphing(false);
            setDisplayOrder(activeOrder);
        }
    });

    if (!particleCount) {
        // GLTF not resolved yet (should already be warm via useGLTF.preload in BrainModel).
        return <BrainModel onSectionClick={onLobeClick} />;
    }

    const showBrainMesh = displayOrder == null && !morphing;
    // The particle cloud is only for the flying scatter mid-transition — a cluster of small
    // soft sprites can never look as crisp as real geometry, no matter how the sprite texture
    // or blending is tuned (which is exactly what "the dots look low resolution" was pointing
    // at). Once settled, each note is a real lit sphere mesh instead (see below).
    const showParticles = morphing;
    const settledScene = !morphing && displayOrder != null ? getScene(displayOrder) : null;

    return (
        <group>
            {showBrainMesh && <BrainModel onSectionClick={onLobeClick} />}

            {showParticles && (
                <points ref={pointsRef}>
                    <bufferGeometry>
                        <bufferAttribute
                            attach="attributes-position"
                            args={[currentRef.current ?? new Float32Array(particleCount * 3), 3]}
                        />
                    </bufferGeometry>
                    <pointsMaterial
                        ref={materialRef}
                        color={colorFor(displayOrder)}
                        map={dotTexture}
                        size={0.095}
                        sizeAttenuation
                        transparent
                        depthWrite={false}
                        opacity={0.95}
                    />
                </points>
            )}

            {settledScene && settledScene.edgePoints.length > 0 && (
                <Line
                    points={Array.from({ length: settledScene.edgePoints.length / 3 }, (_, i): [number, number, number] => [
                        settledScene.edgePoints[i * 3],
                        settledScene.edgePoints[i * 3 + 1],
                        settledScene.edgePoints[i * 3 + 2],
                    ])}
                    segments
                    color={settledScene.color}
                    transparent
                    opacity={0.5}
                    lineWidth={1.5}
                />
            )}

            {/* Each settled note is a real, lit sphere — smooth-shaded geometry rather than a
                sprite, so it stays crisp at any zoom instead of reading as a soft/pixelated
                blob. Doubles as its own click target, no separate invisible hit-mesh needed. */}
            {settledScene &&
                settledScene.nodePositions.map((n) => (
                    <group key={n.id}>
                        <mesh
                            position={n.pos}
                            scale={hoveredNote === n.id ? 1.18 : 1}
                            onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/mind/${settledScene.domainSlug}/${n.slug}`);
                            }}
                            onPointerOver={(e) => {
                                e.stopPropagation();
                                setHoveredNote(n.id);
                                document.body.style.cursor = 'pointer';
                            }}
                            onPointerOut={() => {
                                setHoveredNote((h) => (h === n.id ? null : h));
                                document.body.style.cursor = 'auto';
                            }}
                        >
                            <sphereGeometry args={[NOTE_RADIUS, 24, 24]} />
                            <meshStandardMaterial
                                color={settledScene.color}
                                emissive={settledScene.color}
                                emissiveIntensity={hoveredNote === n.id ? 0.55 : 0.3}
                                roughness={0.35}
                                metalness={0.1}
                            />
                        </mesh>
                        {hoveredNote === n.id && (
                            <Html center zIndexRange={[60, 0]} style={{ pointerEvents: 'none' }}>
                                <div
                                    className="whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm"
                                    style={{
                                        transform: 'translateY(-22px)',
                                        borderColor: 'var(--border)',
                                        color: 'var(--foreground)',
                                        backgroundColor: 'color-mix(in srgb, var(--surface) 92%, transparent)',
                                        backdropFilter: 'blur(6px)',
                                    }}
                                >
                                    {n.name}
                                </div>
                            </Html>
                        )}
                    </group>
                ))}
        </group>
    );
}
