'use client';

import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Center, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useSpring, a } from '@react-spring/three';

type MeshKey = 'Frontal' | 'Parietal' | 'Occipital' | 'Temporal' | 'cerebellum';

const meshToOrderMap: Record<MeshKey, number> = {
    'Frontal': 1,
    'Parietal': 2,
    'Occipital': 3,
    'Temporal': 4,
    'cerebellum': 5
};

const meshToBinaryMap: Record<MeshKey, string> = {
    'Frontal': '0001',
    'Parietal': '0010',
    'Occipital': '0011',
    'Temporal': '0100',
    'cerebellum': '0101'
};

export function BrainModel({
    activeSection,
    onSectionClick
}: {
    activeSection: number | null;
    onSectionClick: (id: number | null) => void;
}) {
    const { nodes, materials } = useGLTF('/brain2.glb') as any;
    const groupRef = useRef<THREE.Group>(null);
    const [hoveredMesh, setHoveredMesh] = useState<string | null>(null);

    // Pre-clone materials so we aren't cloning on every render frame
    const clonedMaterials = useMemo(() => {
        if (!materials) return {} as any;
        return {
            Frontal: materials.Frontal?.clone(),
            Parietal: materials.Parietal?.clone(),
            Occipital: materials.Occipital?.clone(),
            Temporal: materials.Temporal?.clone(),
            cerebellum: materials.cerebellum?.clone(),
            lambert1: materials.lambert1?.clone(),
        };
    }, [materials]);

    useFrame((state) => {
        const time = state.clock.elapsedTime;
        if (groupRef.current && !activeSection) {
            // Constrain rotation to oscillate between -30 and 15 degrees
            const minAngle = -30 * (Math.PI / 180);
            const maxAngle = 15 * (Math.PI / 180);
            const midPoint = (maxAngle + minAngle) / 2;
            const amplitude = (maxAngle - minAngle) / 2;

            groupRef.current.rotation.y = midPoint + Math.sin(time * 0.2) * amplitude;
            groupRef.current.rotation.x = 0;
            groupRef.current.rotation.z = 0;
        }
    });

    const { scale, position } = useSpring({
        scale: activeSection ? 1.95 : 1.56,
        position: activeSection ? [0, -0.5, 0] : [0, 0, 0],
        config: { mass: 1, tension: 170, friction: 30 }
    });

    const renderMesh = (name: string, key: MeshKey) => {
        if (!nodes || !nodes[name] || !clonedMaterials[key]) return null;

        const isActive = activeSection === meshToOrderMap[key];
        const isHovered = hoveredMesh === key;

        const mat = clonedMaterials[key];

        // Highlight active or hovered meshes
        if (isActive || isHovered) {
            mat.emissive = new THREE.Color(0x333333);
        } else {
            mat.emissive = new THREE.Color(0x000000);
        }

        // Calculate center for line start
        const centerPos = useMemo(() => {
            nodes[name].geometry.computeBoundingBox();
            const box = nodes[name].geometry.boundingBox;
            const center = new THREE.Vector3();
            if (box) box.getCenter(center);
            return center.toArray();
        }, [nodes, name]);

        // Calculate offset for label position
        const labelPos = useMemo(() => {
            const v = new THREE.Vector3().fromArray(centerPos);
            // Dynamic push multipliers to separate labels from the complex 3D bounds
            let multiplier = 3.5;
            if (key === 'Temporal') multiplier = 10.5;
            else if (key === 'Parietal' || key === 'Occipital') multiplier = 4.2;
            else if (key === 'Frontal') multiplier = 4.3;
            else if (key === 'cerebellum') multiplier = 3.1;

            v.multiplyScalar(multiplier);

            // Add explicit spatial offsets to prevent closely clustered nodes from overlapping as they rotate
            if (key === 'Temporal') {
                v.y += 1.2;  // Push the Temporal label distinctly upward
            } else if (key === 'cerebellum') {
                v.y -= 1.2;  // Push the Cerebellum label significantly downward
                v.z += 0.5;  // Push it slightly back to increase spatial separation
            } else if (key === 'Frontal') {
                v.y += 0.5;  // Bump Frontal slightly up to ensure it clears Temporal's wider orbit
            }

            return v.toArray();
        }, [centerPos, key]);

        return (
            <group key={name}>
                <mesh
                    geometry={nodes[name].geometry}
                    material={mat}
                    // Optional scale up on active/hover
                    scale={isActive || isHovered ? [1.02, 1.02, 1.02] : [1, 1, 1]}
                    onClick={(e) => {
                        e.stopPropagation();
                        const targetOrder = meshToOrderMap[key];
                        onSectionClick(activeSection === targetOrder ? null : targetOrder);
                    }}
                    onPointerOver={(e) => {
                        e.stopPropagation();
                        setHoveredMesh(key);
                        document.body.style.cursor = 'pointer';
                    }}
                    onPointerOut={(e) => {
                        setHoveredMesh(null);
                        document.body.style.cursor = 'auto';
                    }}
                />

                <Line
                    points={[centerPos as [number, number, number], labelPos as [number, number, number]]}
                    color="#666666" // Dark grey to match theme
                    lineWidth={1.5}
                    transparent
                    opacity={0.6}
                />

                <Html position={labelPos as [number, number, number]} center zIndexRange={[100, 0]}>
                    <div
                        style={{
                            color: 'var(--foreground)',
                            border: '1.5px solid var(--foreground)',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            fontWeight: 'bold',
                            background: 'var(--background)',
                            cursor: 'pointer',
                            userSelect: 'none',
                            transform: isActive || isHovered ? 'scale(1.15)' : 'scale(1)',
                            transition: 'transform 0.1s',
                            whiteSpace: 'nowrap',
                            opacity: 0.85
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            const targetOrder = meshToOrderMap[key];
                            onSectionClick(activeSection === targetOrder ? null : targetOrder);
                        }}
                        onPointerOver={(e) => {
                            e.stopPropagation();
                            setHoveredMesh(key);
                            document.body.style.cursor = 'pointer';
                        }}
                        onPointerOut={(e) => {
                            setHoveredMesh(null);
                            document.body.style.cursor = 'auto';
                        }}
                    >
                        {meshToBinaryMap[key]}
                    </div>
                </Html>
            </group>
        );
    };

    // The GLTF meshes mapped per the output list in Brain1GLB.tsx
    // Removed the -Math.PI / 2 rotation on X that was inverting it
    return (
        <a.group ref={groupRef} position={position as any} scale={scale as any}>
            <Center>
                <group rotation={[0, -Math.PI / 2, 0]}>
                    <group position={[0.391, 0, 0.778]} scale={[0.1, 0.1, 0.1]}>
                        {renderMesh('brain_Frontal_0', 'Frontal')}
                        {renderMesh('brain_Parietal_0', 'Parietal')}
                        {renderMesh('brain_Occipital_0', 'Occipital')}
                        {renderMesh('brain_Temporal_0', 'Temporal')}
                        {renderMesh('brain_cerebellum_0', 'cerebellum')}

                        {/* Rendering the stem/tail natively */}
                        {nodes?.brain_lambert1_0 && clonedMaterials?.lambert1 && (
                            <mesh
                                geometry={nodes.brain_lambert1_0.geometry}
                                material={clonedMaterials.lambert1}
                            />
                        )}
                    </group>
                </group>
            </Center>
        </a.group>
    );
}

useGLTF.preload('/brain2.glb');
