'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { CameraControls, Line } from '@react-three/drei';
import CameraControlsImpl from 'camera-controls';
import * as THREE from 'three';
import { MorphField, type DomainGraphData } from './MorphField';

interface BrainCanvasProps {
    activeOrder: number | null;
    onLobeClick: (order: number | null) => void;
    graphs: Partial<Record<number, DomainGraphData>>;
}

// The case now does a full 360° turn (see SwayGroup), so the "nearest corner" isn't fixed the
// way it was for a static cube — at 45° a corner swings out to CUBE_HALF*sqrt(2), noticeably
// closer to the camera than when axis-aligned. This distance is the smallest that keeps every
// corner inside the frustum across the *entire* rotation (checked by simulating all 8 corners
// at every angle 0-360° — 5.6, the old value, overshoots the frustum edge by about 3% at the
// worst angle, which is exactly the clipping that was reported), with ~30% margin to spare.
const CAMERA_DISTANCE = 7.4;
// How close scrolling/pinching can bring the camera in to inspect the notes graph. Chosen so
// the dots (which sit well within a much smaller radius than the case) are always comfortably
// framed even at max zoom; the case's own wireframe corners can graze the edge of the frame at
// this distance during the most extreme rotation angles, which is an acceptable trade for an
// otherwise-static decorative frame — the notes are the point of zooming in, not the case.
const MIN_ZOOM_DISTANCE = 4.2;
const CUBE_SIZE = 3.2;
const CUBE_HALF = CUBE_SIZE / 2;

const CUBE_CORNERS: [number, number, number][] = (() => {
    const corners: [number, number, number][] = [];
    for (const x of [-CUBE_HALF, CUBE_HALF]) for (const y of [-CUBE_HALF, CUBE_HALF]) for (const z of [-CUBE_HALF, CUBE_HALF]) corners.push([x, y, z]);
    return corners;
})();

const SPIN_SPEED = 0.11; // rad/s — one full turn roughly every 57s

/** A slow, continuous full turn — not the brain's old back-and-forth wobble, which read as
 * "stuck" rather than actually rotating — applied to the whole case (frame + whatever's inside
 * it) so the wireframe box and the notes particles turn together, not just the brain mesh.
 * Independent of CameraControls' drag-to-orbit, which moves the camera rather than this group,
 * so the two compose without fighting. */
function SwayGroup({ children }: { children: React.ReactNode }) {
    const ref = useRef<THREE.Group>(null);
    useFrame((state) => {
        if (!ref.current) return;
        ref.current.rotation.y = state.clock.elapsedTime * SPIN_SPEED;
    });
    return <group ref={ref}>{children}</group>;
}

/** The display-case frame. Edges use drei's fat-line renderer rather than raw
 * THREE.LineBasicMaterial — plain WebGL lines are capped at 1px on most GPUs regardless of
 * `linewidth`, which is why they used to look thin/jagged at any zoom beyond 100%. */
function WireframeCube() {
    const edgePoints = useMemo(() => {
        const geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE));
        const attr = geometry.attributes.position;
        const pts: [number, number, number][] = [];
        for (let i = 0; i < attr.count; i++) pts.push([attr.getX(i), attr.getY(i), attr.getZ(i)]);
        return pts;
    }, []);
    const cornerGeometry = useMemo(() => new THREE.SphereGeometry(0.05, 12, 12), []);
    return (
        <group>
            <Line points={edgePoints} segments color="#8a8a8a" transparent opacity={0.35} lineWidth={1.25} />
            {CUBE_CORNERS.map((pos, i) => (
                <mesh key={i} position={pos} geometry={cornerGeometry}>
                    <meshBasicMaterial color="#9a9a9a" transparent opacity={0.75} />
                </mesh>
            ))}
        </group>
    );
}

export function BrainCanvas({ activeOrder, onLobeClick, graphs }: BrainCanvasProps) {
    const controlsRef = useRef<CameraControlsImpl | null>(null);

    return (
        <Canvas
            camera={{ position: [0, 0, CAMERA_DISTANCE], fov: 50 }}
            onPointerMissed={() => onLobeClick(null)}
            // Renders at the display's real pixel density (capped at 2x for perf) instead of
            // the browser's default 1x backing resolution, which is what made the case's edges
            // and the notes particles look soft/pixelated on retina screens or when zoomed in.
            dpr={[1, 2]}
        >
            <ambientLight intensity={1.5} />
            <directionalLight position={[5, 5, 5]} intensity={1} />
            <SwayGroup>
                <WireframeCube />
                <MorphField activeOrder={activeOrder} onLobeClick={onLobeClick} graphs={graphs} />
            </SwayGroup>
            <CameraControls
                ref={controlsRef}
                // Draggable in every state, not just while the brain is showing — the case
                // itself never moves on its own, so free-rotating it to inspect a note graph
                // from another angle is always available.
                enabled
                minDistance={MIN_ZOOM_DISTANCE}
                maxDistance={CAMERA_DISTANCE}
                minPolarAngle={Math.PI / 2 - 0.45}
                maxPolarAngle={Math.PI / 2 + 0.45}
                minAzimuthAngle={-0.75}
                maxAzimuthAngle={0.75}
                mouseButtons={{
                    left: CameraControlsImpl.ACTION.ROTATE,
                    right: CameraControlsImpl.ACTION.NONE,
                    middle: CameraControlsImpl.ACTION.NONE,
                    wheel: CameraControlsImpl.ACTION.DOLLY,
                }}
                touches={{
                    one: CameraControlsImpl.ACTION.TOUCH_ROTATE,
                    two: CameraControlsImpl.ACTION.TOUCH_DOLLY,
                    three: CameraControlsImpl.ACTION.NONE,
                }}
            />
        </Canvas>
    );
}
