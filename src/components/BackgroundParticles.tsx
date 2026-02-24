'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function BackgroundParticles({ count = 100 }: { count?: number }) {
    const groupRef = useRef<THREE.Group>(null);
    const particlesRef = useRef<THREE.InstancedMesh>(null);

    // Generate random positions, rotations, and types (0=Line Section, 1=Circle, 2=Square)
    const [positions, rotations, types, speeds] = useMemo(() => {
        const p = new Float32Array(count * 3);
        const r = new Float32Array(count * 3);
        const t = new Float32Array(count);
        const s = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            // Spread them out widely behind and around the brain
            p[i * 3 + 0] = (Math.random() - 0.5) * 15; // x
            p[i * 3 + 1] = (Math.random() - 0.5) * 15; // y
            p[i * 3 + 2] = (Math.random() - 0.5) * 5 - 3; // z (mostly pushed back)

            r[i * 3 + 0] = Math.random() * Math.PI;
            r[i * 3 + 1] = Math.random() * Math.PI;
            r[i * 3 + 2] = Math.random() * Math.PI;

            t[i] = Math.floor(Math.random() * 3);

            // Random drift speeds
            s[i * 3 + 0] = (Math.random() - 0.5) * 0.2;
            s[i * 3 + 1] = (Math.random() - 0.5) * 0.2;
            s[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
        }
        return [p, r, t, s];
    }, [count]);

    // Setup InstancedMesh materials to match current theme
    const isDark = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
    const materialColor = isDark ? '#aaaaaa' : '#555555';

    // We use a base sphere geometry for the instanced "circuit nodes"
    const geometry = useMemo(() => new THREE.SphereGeometry(0.04, 8, 8), []);
    const material = useMemo(() => new THREE.MeshBasicMaterial({ color: materialColor, transparent: true, opacity: 0.3 }), [materialColor]);

    const dummy = useMemo(() => new THREE.Object3D(), []);

    useFrame((state) => {
        const time = state.clock.elapsedTime * 0.1;

        if (groupRef.current) {
            // Very slow global rotation
            groupRef.current.rotation.y = time * 0.2;
            groupRef.current.rotation.x = time * 0.1;
        }

        if (particlesRef.current) {
            for (let i = 0; i < count; i++) {
                // Update position with drift speed
                positions[i * 3 + 0] += speeds[i * 3 + 0] * 0.01;
                positions[i * 3 + 1] += speeds[i * 3 + 1] * 0.01;
                positions[i * 3 + 2] += speeds[i * 3 + 2] * 0.01;

                // Wrap around bounds to keep them inside view
                if (Math.abs(positions[i * 3 + 0]) > 7.5) positions[i * 3 + 0] *= -0.99;
                if (Math.abs(positions[i * 3 + 1]) > 7.5) positions[i * 3 + 1] *= -0.99;
                if (Math.abs(positions[i * 3 + 2] + 3) > 2.5) positions[i * 3 + 2] = -3 + (Math.random() - 0.5) * 5;

                dummy.position.set(positions[i * 3 + 0], positions[i * 3 + 1], positions[i * 3 + 2]);
                dummy.rotation.set(
                    rotations[i * 3 + 0] + time * speeds[i * 3 + 0],
                    rotations[i * 3 + 1] + time * speeds[i * 3 + 1],
                    rotations[i * 3 + 2] + time * speeds[i * 3 + 2]
                );

                // Scale based on "type" 
                const s = types[i] === 0 ? 0.5 : types[i] === 1 ? 1 : 2;
                dummy.scale.set(s, s, s);

                dummy.updateMatrix();
                particlesRef.current.setMatrixAt(i, dummy.matrix);
            }
            particlesRef.current.instanceMatrix.needsUpdate = true;
        }
    });

    // Create static abstract geometric elements specifically mapping 1s and 0s
    // To avoid troika-three-text font fetching errors on Next.js, we use primitive shapes.
    // 1 = Thin tall box (line)
    // 0 = Torus (ring)
    const binaryNodes = useMemo(() => {
        const oneGeometry = new THREE.BoxGeometry(0.05, 0.4, 0.05);
        const zeroGeometry = new THREE.TorusGeometry(0.15, 0.04, 8, 16);
        const nodeMaterial = new THREE.MeshBasicMaterial({ color: materialColor, transparent: true, opacity: 0.3 });

        return Array.from({ length: 40 }).map((_, i) => {
            const isOne = Math.random() > 0.5;
            const x = (Math.random() - 0.5) * 10;
            const y = (Math.random() - 0.5) * 10;
            const z = (Math.random() - 0.5) * 4 - 2;
            const rotZ = Math.random() * Math.PI;

            return (
                <mesh
                    key={i}
                    geometry={isOne ? oneGeometry : zeroGeometry}
                    material={nodeMaterial}
                    position={[x, y, z]}
                    rotation={[0, 0, rotZ]}
                />
            );
        });
    }, [materialColor]);

    return (
        <group ref={groupRef}>
            <instancedMesh ref={particlesRef} args={[geometry, material, count]} />
            {binaryNodes}
        </group>
    );
}
