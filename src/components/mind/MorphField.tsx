'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useRouter } from 'next/navigation';
import * as THREE from 'three';
import { BrainModel } from '../BrainModel';
import { sampleBrainParticles, layoutGraphIn3D, assignParticlesToNodes } from './particles';

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
const HIT_RADIUS = 0.16;

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
 * back to idle. No rotating the case; the case itself never moves, only what's drawn in it. */
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

    const [displayOrder, setDisplayOrder] = useState<number | null>(activeOrder);
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

    // Seed the working buffer and per-particle scatter directions once the brain geometry
    // (and therefore the particle count) is known.
    useEffect(() => {
        if (!particleCount) return;
        const dirs = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
            const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
            dirs[i * 3] = v.x;
            dirs[i * 3 + 1] = v.y;
            dirs[i * 3 + 2] = v.z;
        }
        jitterDirsRef.current = dirs;
        if (!currentRef.current) {
            currentRef.current = new Float32Array(targetFor(displayOrder) ?? new Float32Array(particleCount * 3));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [particleCount]);

    const isFirstRun = useRef(true);
    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }
        if (!particleCount || !currentRef.current) return;
        fromRef.current = currentRef.current.slice();
        toRef.current = targetFor(activeOrder);
        fromColorRef.current = (materialRef.current?.color ?? colorFor(displayOrder)).clone();
        toColorRef.current = colorFor(activeOrder).clone();
        startTimeRef.current = performance.now();
        setMorphing(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeOrder, particleCount]);

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
    const showParticles = morphing || displayOrder != null;
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
                        color="#9a9a9a"
                        size={0.055}
                        sizeAttenuation
                        transparent
                        depthWrite={false}
                        opacity={0.9}
                    />
                </points>
            )}

            {settledScene && settledScene.edgePoints.length > 0 && (
                <lineSegments>
                    <bufferGeometry>
                        <bufferAttribute attach="attributes-position" args={[settledScene.edgePoints, 3]} />
                    </bufferGeometry>
                    <lineBasicMaterial color={settledScene.color} transparent opacity={0.4} />
                </lineSegments>
            )}

            {/* Invisible click targets over each settled note cluster — real navigation, not decoration. */}
            {settledScene &&
                settledScene.nodePositions.map((n) => (
                    <mesh
                        key={n.id}
                        position={n.pos}
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
                        <sphereGeometry args={[HIT_RADIUS, 8, 8]} />
                        {/* depthWrite off — a transparent, opacity:0 material still writes the
                            depth buffer by default, which was silently hiding the particle
                            cluster sitting inside this same invisible hit-sphere. */}
                        <meshBasicMaterial
                            color={settledScene.color}
                            transparent
                            depthWrite={false}
                            opacity={hoveredNote === n.id ? 0.28 : 0}
                        />
                    </mesh>
                ))}
        </group>
    );
}
