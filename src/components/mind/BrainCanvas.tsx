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

    // Reacts to externally-driven selection changes (a lobe click, or the domain box's
    // close button) so the camera transition runs no matter what triggered it.
    useEffect(() => {
        const controls = controlsRef.current;
        if (!controls) return;

        if (activeOrder == null) {
            controls.reset(true);
            return;
        }

        // BrainModel keeps rotating the brain toward its neutral pose for ~0.5s after
        // selection (see the damp in its useFrame) — read the socket's position only once
        // that settles, otherwise the camera locks onto a point that moves out from under it.
        const settleTimer = setTimeout(() => {
            const obj = socketRefs[activeOrder]?.current;
            if (!obj) return;

            const target = new THREE.Vector3();
            obj.getWorldPosition(target);
            // Pan the existing front-on framing to center on the lobe, rather than
            // recomputing an absolute position — that would view the brain from whatever
            // odd angle the lobe's raw local coordinates happen to point in.
            controls.moveTo(target.x, target.y, target.z, true).then(() => {
                requestAnimationFrame(() => projectSocket(activeOrder));
            });
        }, 550);

        return () => clearTimeout(settleTimer);
    }, [activeOrder, socketRefs, projectSocket]);

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
