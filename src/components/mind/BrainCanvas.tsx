'use client';

import { useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import CameraControlsImpl from 'camera-controls';
import * as THREE from 'three';
import { MorphField, type DomainGraphData } from './MorphField';

interface BrainCanvasProps {
    activeOrder: number | null;
    onLobeClick: (order: number | null) => void;
    graphs: Partial<Record<number, DomainGraphData>>;
}

// Distance is set well past the cube's own half-size so its nearest corners (closest to the
// camera, hence the largest on screen) stay inside the frustum with margin — at a smaller
// distance the cube's own edges get clipped by the canvas, which is what "bigger" actually needs.
const CAMERA_DISTANCE = 5.6;
const CUBE_SIZE = 3.2;
const CUBE_HALF = CUBE_SIZE / 2;

const CUBE_CORNERS: [number, number, number][] = (() => {
    const corners: [number, number, number][] = [];
    for (const x of [-CUBE_HALF, CUBE_HALF]) for (const y of [-CUBE_HALF, CUBE_HALF]) for (const z of [-CUBE_HALF, CUBE_HALF]) corners.push([x, y, z]);
    return corners;
})();

/** The display-case frame. It stays completely still — the transition between what it's
 * showing is carried entirely by MorphField's particle dissolve, not by moving the case. */
function WireframeCube() {
    const geometry = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE)), []);
    const cornerGeometry = useMemo(() => new THREE.SphereGeometry(0.05, 12, 12), []);
    return (
        <group>
            <lineSegments geometry={geometry}>
                <lineBasicMaterial color="#8a8a8a" transparent opacity={0.35} />
            </lineSegments>
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
        >
            <ambientLight intensity={1.5} />
            <directionalLight position={[5, 5, 5]} intensity={1} />
            <WireframeCube />
            <MorphField activeOrder={activeOrder} onLobeClick={onLobeClick} graphs={graphs} />
            <CameraControls
                ref={controlsRef}
                // Draggable in every state, not just while the brain is showing — the case
                // itself never moves on its own, so free-rotating it to inspect a note graph
                // from another angle is always available.
                enabled
                minDistance={CAMERA_DISTANCE}
                maxDistance={CAMERA_DISTANCE}
                minPolarAngle={Math.PI / 2 - 0.45}
                maxPolarAngle={Math.PI / 2 + 0.45}
                minAzimuthAngle={-0.75}
                maxAzimuthAngle={0.75}
                mouseButtons={{
                    left: CameraControlsImpl.ACTION.ROTATE,
                    right: CameraControlsImpl.ACTION.NONE,
                    middle: CameraControlsImpl.ACTION.NONE,
                    wheel: CameraControlsImpl.ACTION.NONE,
                }}
                touches={{
                    one: CameraControlsImpl.ACTION.TOUCH_ROTATE,
                    two: CameraControlsImpl.ACTION.NONE,
                    three: CameraControlsImpl.ACTION.NONE,
                }}
            />
        </Canvas>
    );
}
