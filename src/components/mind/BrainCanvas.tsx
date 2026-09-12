'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import CameraControlsImpl from 'camera-controls';
import * as THREE from 'three';
import { BrainModel, type SocketRefs } from '../BrainModel';

export interface ProjectedPoint {
    x: number;
    y: number;
}

interface BrainCanvasProps {
    activeOrder: number | null;
    onLobeClick: (order: number | null) => void;
    onSocketProjected: (order: number, point: ProjectedPoint) => void;
    containerRef: React.RefObject<HTMLDivElement | null>;
}

const CAMERA_DISTANCE = 4.5;
const CUBE_SIZE = 2.6;

/** The static display-case frame the brain rotates inside — camera and cube never move,
 * only the brain does, so the "box" always stays centered regardless of what's selected. */
function WireframeCube() {
    const geometry = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE)), []);
    return (
        <lineSegments geometry={geometry}>
            <lineBasicMaterial color="#8a8a8a" transparent opacity={0.4} />
        </lineSegments>
    );
}

export function BrainCanvas({ activeOrder, onLobeClick, onSocketProjected, containerRef }: BrainCanvasProps) {
    const controlsRef = useRef<CameraControls | null>(null);
    const cameraRef = useRef<THREE.Camera | null>(null);

    const socketRefs = useMemo<SocketRefs>(
        () => ({
            1: { current: null },
            2: { current: null },
            3: { current: null },
            4: { current: null },
            5: { current: null },
        }),
        [],
    );

    const projectSocket = useCallback(
        (order: number) => {
            const obj = socketRefs[order]?.current;
            const container = containerRef.current;
            const camera = cameraRef.current;
            if (!obj || !container || !camera) return;

            const worldPos = new THREE.Vector3();
            obj.getWorldPosition(worldPos);
            const ndc = worldPos.clone().project(camera);
            const rect = container.getBoundingClientRect();
            onSocketProjected(order, {
                x: (ndc.x * 0.5 + 0.5) * rect.width,
                y: (-ndc.y * 0.5 + 0.5) * rect.height,
            });
        },
        [socketRefs, containerRef, onSocketProjected],
    );

    // Camera and cube never move — only the brain rotates (see BrainModel's useFrame) — so once
    // a lobe is selected we just wait for that settle-to-neutral animation to finish, then read
    // wherever the lobe ended up for the circuit trace's starting point.
    useEffect(() => {
        if (activeOrder == null) return;

        const settleTimer = setTimeout(() => {
            requestAnimationFrame(() => projectSocket(activeOrder));
        }, 550);

        return () => clearTimeout(settleTimer);
    }, [activeOrder, projectSocket]);

    return (
        <Canvas
            camera={{ position: [0, 0, CAMERA_DISTANCE], fov: 50 }}
            onCreated={({ camera }) => {
                cameraRef.current = camera;
            }}
            onPointerMissed={() => onLobeClick(null)}
        >
            <ambientLight intensity={1.5} />
            <directionalLight position={[5, 5, 5]} intensity={1} />
            <WireframeCube />
            <BrainModel activeSection={activeOrder} onSectionClick={onLobeClick} socketRefs={socketRefs} />
            <CameraControls
                ref={controlsRef}
                enabled={activeOrder == null}
                minDistance={CAMERA_DISTANCE}
                maxDistance={CAMERA_DISTANCE}
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
