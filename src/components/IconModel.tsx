'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

function generateIconPoints(type: string, count: number = 80) {
    const points: { position: [number, number, number], char: string }[] = [];
    const chars = ['0', '1'];

    for (let i = 0; i < count; i++) {
        let x = 0, y = 0, z = 0;

        // A simple math string like "math", "ann", "code", "book", "progress"
        if (type === 'math') {
            // e.g. an "e" or pi shape
            x = (Math.random() - 0.5) * 2;
            y = (Math.random() - 0.5) * 2;
            z = (Math.random() - 0.5) * 0.5;
        } else if (type === 'ann') {
            // Three layers of nodes
            const layer = Math.floor(Math.random() * 3);
            x = (layer - 1) * 1.5;
            y = (Math.random() - 0.5) * 3;
            z = (Math.random() - 0.5) * 0.5;
        } else if (type === 'code') {
            // brackets <>
            const isLeft = Math.random() < 0.5;
            if (isLeft) {
                x = -1 + Math.random() * 0.5;
                y = (Math.random() - 0.5) * 2;
                x += Math.abs(y) * 0.5; // chevron <
            } else {
                x = 1 - Math.random() * 0.5;
                y = (Math.random() - 0.5) * 2;
                x -= Math.abs(y) * 0.5; // chevron >
            }
        } else if (type === 'book') {
            // open book shape
            const side = Math.random() < 0.5 ? 1 : -1;
            x = side * (0 + Math.random() * 1.5);
            z = Math.abs(x) * -0.5 + Math.random() * 0.2;
            y = (Math.random() - 0.5) * 2;
        } else if (type === 'progress') {
            // arrow pointing up right
            const isTip = Math.random() < 0.4;
            if (isTip) {
                x = 0.5 + Math.random() * 1;
                y = 0.5 + Math.random() * 1;
                if (Math.random() < 0.5) x = 1.5 - Math.random() * 1;
                if (Math.random() > 0.5) y = 1.5 - Math.random() * 1;
            } else {
                const t = -1.5 + Math.random() * 3;
                x = t;
                y = t;
            }
        } else {
            // Random sphere for others
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            x = Math.sin(phi) * Math.cos(theta);
            y = Math.cos(phi);
            z = Math.sin(phi) * Math.sin(theta);
        }

        points.push({
            position: [x, y, z],
            char: chars[Math.floor(Math.random() * chars.length)]
        });
    }
    return points;
}

export function IconModel({ type }: { type: string }) {
    const points = useMemo(() => generateIconPoints(type), [type]);
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = state.clock.elapsedTime * 0.5;
        }
    });

    const isDark = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
    const color = isDark ? '#ffffff' : '#000000';

    return (
        <group ref={groupRef} scale={1.5}>
            {points.map((p, i) => (
                <Text key={`icon-${i}`} position={p.position} fontSize={0.2} color={color} anchorX="center" anchorY="middle">
                    {p.char}
                </Text>
            ))}
        </group>
    );
}
