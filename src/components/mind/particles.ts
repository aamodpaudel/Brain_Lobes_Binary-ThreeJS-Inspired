import * as THREE from 'three';

// Mirrors BrainModel's transform chain — group(scale 1.56) > Center > group(rotateY -90°) >
// group(position, scale 0.1) > lobe meshes — purely in local math, so sampled particles land
// exactly where the real mesh renders without mounting anything to measure.
const LOBE_NAMES = [
    'brain_Frontal_0',
    'brain_Parietal_0',
    'brain_Occipital_0',
    'brain_Temporal_0',
    'brain_cerebellum_0',
    'brain_lambert1_0',
];

const ROT_Y = -Math.PI / 2;
const INNER_POS = new THREE.Vector3(0.391, 0, 0.778);
const INNER_SCALE = 0.1;
const OUTER_SCALE = 1.56;
const COS_R = Math.cos(ROT_Y);
const SIN_R = Math.sin(ROT_Y);

function rotateY(v: THREE.Vector3): THREE.Vector3 {
    const x = v.x * COS_R + v.z * SIN_R;
    const z = -v.x * SIN_R + v.z * COS_R;
    return new THREE.Vector3(x, v.y, z);
}

/** posScaleGroup (scale then translate) followed by rotGroup's rotation — the two transforms
 * <Center> sits "outside" of, so its own correction has to be measured after these are applied. */
function toRotatedSpace(raw: THREE.Vector3): THREE.Vector3 {
    const scaled = raw.clone().multiplyScalar(INNER_SCALE).add(INNER_POS);
    return rotateY(scaled);
}

/** Samples roughly `targetCount` points off the brain's actual mesh vertices, transformed into
 * the same space BrainModel renders in, so the particle system's "brain" endpoint lines up
 * pixel-for-pixel with the real mesh it's dissolving into/from. */
export function sampleBrainParticles(
    nodes: Record<string, THREE.Mesh> | undefined,
    targetCount: number,
): Float32Array | null {
    if (!nodes) return null;
    const geometries = LOBE_NAMES.map((n) => nodes[n]?.geometry).filter(Boolean) as THREE.BufferGeometry[];
    if (geometries.length === 0) return null;

    // Pass 1: bounding box across every vertex (post rotation) replicates what <Center> measures.
    const box = new THREE.Box3();
    for (const geom of geometries) {
        const attr = geom.attributes.position;
        for (let i = 0; i < attr.count; i++) {
            box.expandByPoint(toRotatedSpace(new THREE.Vector3().fromBufferAttribute(attr, i)));
        }
    }
    const center = box.getCenter(new THREE.Vector3());

    // Pass 2: sample an evenly-strided subset and finish the chain (Center offset, outer scale).
    const totalVerts = geometries.reduce((sum, g) => sum + g.attributes.position.count, 0);
    const stride = Math.max(1, Math.floor(totalVerts / targetCount));
    const points: number[] = [];
    for (const geom of geometries) {
        const attr = geom.attributes.position;
        for (let i = 0; i < attr.count; i += stride) {
            const v = new THREE.Vector3().fromBufferAttribute(attr, i);
            const p = toRotatedSpace(v).sub(center).multiplyScalar(OUTER_SCALE);
            points.push(p.x, p.y, p.z);
        }
    }
    return new Float32Array(points);
}

function mulberry32(seed: number) {
    let s = seed | 0;
    return function random() {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export interface GraphNodeLike {
    id: number;
}

export interface GraphEdgeLike {
    source: number;
    target: number;
}

const LAYOUT_RADIUS = 1.15; // stays well inside the case's CUBE_HALF (1.6)

/** A seed derived from the actual note ids/edges, not just their counts — two domains that
 * happen to both have e.g. 2 notes and 1 edge previously got the exact same seed (and therefore
 * an identical-looking layout, just recolored). Note ids are unique across every domain, so
 * hashing them in makes each domain's arrangement genuinely its own. */
function graphSeed(nodes: GraphNodeLike[], edges: GraphEdgeLike[]): number {
    let h = nodes.length * 733 + edges.length * 17 + 11;
    for (const n of nodes) h = (h * 2654435761 + n.id * 97) | 0;
    for (const e of edges) h = (h * 2654435761 + e.source * 13 + e.target * 7) | 0;
    return h;
}

/** A small force-directed relaxation in 3D — repulsion between every pair, spring attraction
 * along real edges, gentle centering — seeded on a Fibonacci-sphere so it doesn't start as a
 * degenerate pile. Cheap enough to just run synchronously for the handful of notes a domain has. */
export function layoutGraphIn3D(nodes: GraphNodeLike[], edges: GraphEdgeLike[]): Map<number, THREE.Vector3> {
    const positions = new Map<number, THREE.Vector3>();
    if (nodes.length === 0) return positions;
    if (nodes.length === 1) {
        positions.set(nodes[0].id, new THREE.Vector3());
        return positions;
    }

    const rand = mulberry32(graphSeed(nodes, edges));

    // A genuinely random direction per node, not a Fibonacci-sphere formula — the formula's
    // even spacing is only actually useful for large N; for the small graphs these domains
    // have (2-4 notes is typical), it instead put every node within a small wobble of the
    // same Y axis (both poles of a 2-point "sphere" sit at r=0), so every domain's pair came
    // out looking like a near-vertical line at a slightly different tilt. Full randomness,
    // seeded per-domain, gives each domain its own orientation, not just its own wobble.
    nodes.forEach((n) => {
        const dir = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
        const r = LAYOUT_RADIUS * (0.25 + rand() * 0.45);
        positions.set(n.id, dir.multiplyScalar(r));
    });

    const ids = nodes.map((n) => n.id);
    const validEdges = edges.filter((e) => positions.has(e.source) && positions.has(e.target));

    for (let iter = 0; iter < 220; iter++) {
        const forces = new Map<number, THREE.Vector3>();
        ids.forEach((id) => forces.set(id, new THREE.Vector3()));

        for (let i = 0; i < ids.length; i++) {
            for (let j = i + 1; j < ids.length; j++) {
                const a = positions.get(ids[i])!;
                const b = positions.get(ids[j])!;
                const diff = a.clone().sub(b);
                let dist = diff.length();
                if (dist < 1e-4) {
                    diff.set(rand() - 0.5, rand() - 0.5, rand() - 0.5);
                    dist = diff.length() || 1e-4;
                }
                const repulsion = diff.normalize().multiplyScalar(0.024 / (dist * dist));
                forces.get(ids[i])!.add(repulsion);
                forces.get(ids[j])!.sub(repulsion);
            }
        }

        // Connected notes pull in noticeably tighter than the general repulsion spreads
        // everything else apart — the closeness itself is what reads as "these are related",
        // same idea as a semantic-similarity graph clustering related nodes together.
        for (const e of validEdges) {
            const a = positions.get(e.source)!;
            const b = positions.get(e.target)!;
            const diff = b.clone().sub(a);
            const dist = diff.length() || 1e-4;
            const targetLen = 0.5;
            const pull = diff.normalize().multiplyScalar((dist - targetLen) * 0.065);
            forces.get(e.source)!.add(pull);
            forces.get(e.target)!.sub(pull);
        }

        for (const id of ids) {
            forces.get(id)!.add(positions.get(id)!.clone().multiplyScalar(-0.012));
        }

        for (const id of ids) {
            positions.set(id, positions.get(id)!.add(forces.get(id)!));
        }
    }

    for (const id of ids) {
        const p = positions.get(id)!;
        if (p.length() > LAYOUT_RADIUS) p.setLength(LAYOUT_RADIUS);
    }

    return positions;
}

// Tight enough that the soft sprites (see MorphField's dot texture) overlap heavily and blend
// into one smooth glowing knot under additive blending, rather than each particle's own soft
// edge staying visible as a separate "petal" — which is what a wider spread looked like.
const NODE_CLUSTER_JITTER = 0.045;

/** Spreads the shared particle pool across the laid-out note positions — most particles land in
 * a tight jittered cluster around whichever note they're assigned to, so a note reads as a small
 * knot of "neurons" rather than one lonely dot. With no notes yet, everything collapses to a
 * small idle knot at the center instead of vanishing. */
export function assignParticlesToNodes(
    nodeIds: number[],
    nodePositions: Map<number, THREE.Vector3>,
    particleCount: number,
): Float32Array {
    const out = new Float32Array(particleCount * 3);
    let seed = particleCount * 31 + nodeIds.length * 7 + 3;
    for (const id of nodeIds) seed = (seed * 2654435761 + id * 97) | 0;
    const rand = mulberry32(seed);

    if (nodeIds.length === 0) {
        for (let i = 0; i < particleCount; i++) {
            const dir = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
            const p = dir.multiplyScalar(rand() * 0.1);
            out[i * 3] = p.x;
            out[i * 3 + 1] = p.y;
            out[i * 3 + 2] = p.z;
        }
        return out;
    }

    for (let i = 0; i < particleCount; i++) {
        const id = nodeIds[i % nodeIds.length];
        const center = nodePositions.get(id) ?? new THREE.Vector3();
        const dir = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
        // Biased toward the center (rand()**1.6, not a plain uniform radius) so the cluster has
        // a dense, bright core under additive blending with a soft falloff at the edges — a
        // glowing knot rather than a uniformly-speckled ball.
        const p = center.clone().addScaledVector(dir, Math.pow(rand(), 1.6) * NODE_CLUSTER_JITTER);
        out[i * 3] = p.x;
        out[i * 3 + 1] = p.y;
        out[i * 3 + 2] = p.z;
    }
    return out;
}
