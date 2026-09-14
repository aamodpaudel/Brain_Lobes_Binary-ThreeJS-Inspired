'use client';

import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Center } from '@react-three/drei';
import * as THREE from 'three';

type MeshKey = 'Frontal' | 'Parietal' | 'Occipital' | 'Temporal' | 'cerebellum';

const meshToOrderMap: Record<MeshKey, number> = {
    'Frontal': 1,
    'Parietal': 2,
    'Occipital': 3,
    'Temporal': 4,
    'cerebellum': 5
};

type GLTFNodes = Record<string, THREE.Mesh>;
type GLTFMaterials = Record<string, THREE.Material>;

interface LobeMeshProps {
    name: string;
    meshKey: MeshKey;
    geometry: THREE.BufferGeometry;
    baseMaterial: THREE.Material;
    isHovered: boolean;
    onHover: (key: MeshKey | null) => void;
    onClick: () => void;
}

/** A clickable lobe. The binary-tag labels that used to float beside each lobe (and swing
 * through the model at odd angles as it rotated) are gone — navigation now happens via the
 * box's own prev/next arrows, so the lobes only need a hover highlight and a click. */
function LobeMesh({ name, meshKey, geometry, baseMaterial, isHovered, onHover, onClick }: LobeMeshProps) {
    // Never mutate baseMaterial (a prop) — clone it into a fresh instance whenever the
    // highlight state changes, so the emissive color is written only to a locally-owned object.
    const material = useMemo(() => {
        const m = baseMaterial.clone() as THREE.MeshStandardMaterial;
        m.emissive = new THREE.Color(isHovered ? 0x333333 : 0x000000);
        return m;
    }, [baseMaterial, isHovered]);

    return (
        <mesh
            key={name}
            geometry={geometry}
            material={material}
            scale={isHovered ? [1.02, 1.02, 1.02] : [1, 1, 1]}
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            onPointerOver={(e) => {
                e.stopPropagation();
                onHover(meshKey);
                document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
                onHover(null);
                document.body.style.cursor = 'auto';
            }}
        />
    );
}

/** The brain — shown only while the display case is in its idle (no domain selected) state.
 * Gently oscillates in place; selecting a lobe swaps this out for a domain icon one level up
 * (see BrainCanvas), so this component no longer needs an "active" pose of its own. */
export function BrainModel({ onSectionClick }: { onSectionClick: (id: number) => void }) {
    const { nodes, materials } = useGLTF('/brain2.glb') as unknown as { nodes: GLTFNodes; materials: GLTFMaterials };
    const groupRef = useRef<THREE.Group>(null);
    const [hoveredMesh, setHoveredMesh] = useState<MeshKey | null>(null);

    // Pre-clone materials so we aren't cloning on every render frame
    const clonedMaterials = useMemo(() => {
        if (!materials) return {} as Record<string, THREE.Material>;
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
        if (!groupRef.current) return;

        // Constrain rotation to oscillate between -30 and 15 degrees
        const minAngle = -30 * (Math.PI / 180);
        const maxAngle = 15 * (Math.PI / 180);
        const midPoint = (maxAngle + minAngle) / 2;
        const amplitude = (maxAngle - minAngle) / 2;

        groupRef.current.rotation.y = midPoint + Math.sin(time * 0.2) * amplitude;
        groupRef.current.rotation.x = 0;
        groupRef.current.rotation.z = 0;
    });

    const lobes: { name: string; key: MeshKey }[] = [
        { name: 'brain_Frontal_0', key: 'Frontal' },
        { name: 'brain_Parietal_0', key: 'Parietal' },
        { name: 'brain_Occipital_0', key: 'Occipital' },
        { name: 'brain_Temporal_0', key: 'Temporal' },
        { name: 'brain_cerebellum_0', key: 'cerebellum' },
    ];

    return (
        <group ref={groupRef} scale={1.56}>
            <Center>
                <group rotation={[0, -Math.PI / 2, 0]}>
                    <group position={[0.391, 0, 0.778]} scale={[0.1, 0.1, 0.1]}>
                        {lobes.map(({ name, key }) => {
                            const mesh = nodes?.[name];
                            const baseMaterial = clonedMaterials[key];
                            if (!mesh || !baseMaterial) return null;
                            const order = meshToOrderMap[key];

                            return (
                                <LobeMesh
                                    key={name}
                                    name={name}
                                    meshKey={key}
                                    geometry={mesh.geometry}
                                    baseMaterial={baseMaterial}
                                    isHovered={hoveredMesh === key}
                                    onHover={setHoveredMesh}
                                    onClick={() => onSectionClick(order)}
                                />
                            );
                        })}

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
        </group>
    );
}

useGLTF.preload('/brain2.glb');
