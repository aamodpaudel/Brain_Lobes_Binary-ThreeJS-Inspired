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

type GLTFNodes = Record<string, THREE.Mesh>;
type GLTFMaterials = Record<string, THREE.Material>;

export type SocketRefs = Partial<Record<number, React.RefObject<THREE.Object3D | null>>>;

interface LobeMeshProps {
    name: string;
    meshKey: MeshKey;
    geometry: THREE.BufferGeometry;
    baseMaterial: THREE.Material;
    isActive: boolean;
    isHovered: boolean;
    socketRef?: React.RefObject<THREE.Object3D | null>;
    onHover: (key: MeshKey | null) => void;
    onClick: () => void;
}

function LobeMesh({ name, meshKey, geometry, baseMaterial, isActive, isHovered, socketRef, onHover, onClick }: LobeMeshProps) {
    // Never mutate baseMaterial (a prop) — clone it into a fresh instance whenever the
    // highlight state changes, so the emissive color is written only to a locally-owned object.
    const material = useMemo(() => {
        const m = baseMaterial.clone() as THREE.MeshStandardMaterial;
        m.emissive = new THREE.Color(isActive || isHovered ? 0x333333 : 0x000000);
        return m;
    }, [baseMaterial, isActive, isHovered]);

    const centerPos = useMemo(() => {
        geometry.computeBoundingBox();
        const box = geometry.boundingBox;
        const center = new THREE.Vector3();
        if (box) box.getCenter(center);
        return center.toArray() as [number, number, number];
    }, [geometry]);

    const labelPos = useMemo(() => {
        const v = new THREE.Vector3().fromArray(centerPos);
        // Dynamic push multipliers to separate labels from the complex 3D bounds
        let multiplier = 3.5;
        if (meshKey === 'Temporal') multiplier = 10.5;
        else if (meshKey === 'Parietal' || meshKey === 'Occipital') multiplier = 4.2;
        else if (meshKey === 'Frontal') multiplier = 4.3;
        else if (meshKey === 'cerebellum') multiplier = 3.1;

        v.multiplyScalar(multiplier);

        // Add explicit spatial offsets to prevent closely clustered nodes from overlapping as they rotate
        if (meshKey === 'Temporal') {
            v.y += 1.2; // Push the Temporal label distinctly upward
        } else if (meshKey === 'cerebellum') {
            v.y -= 1.2; // Push the Cerebellum label significantly downward
            v.z += 0.5; // Push it slightly back to increase spatial separation
        } else if (meshKey === 'Frontal') {
            v.y += 0.5; // Bump Frontal slightly up to ensure it clears Temporal's wider orbit
        }

        return v.toArray() as [number, number, number];
    }, [centerPos, meshKey]);

    return (
        <group key={name}>
            {socketRef && <object3D ref={socketRef} position={centerPos} />}
            <mesh
                geometry={geometry}
                material={material}
                scale={isActive || isHovered ? [1.02, 1.02, 1.02] : [1, 1, 1]}
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

            <Line points={[centerPos, labelPos]} color="#666666" lineWidth={1.5} transparent opacity={0.6} />

            <Html position={labelPos} center zIndexRange={[100, 0]}>
                <div
                    style={{
                        color: '#444',
                        border: '1px solid rgba(255,255,255,0.5)',
                        borderRadius: '12px',
                        padding: '5px 10px',
                        fontSize: '11px',
                        fontFamily: 'sans-serif',
                        fontWeight: 'normal',
                        background: 'rgba(255,255,255,0.4)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                        cursor: 'pointer',
                        userSelect: 'none',
                        transform: isActive || isHovered ? 'scale(1.15)' : 'scale(1)',
                        transition: 'transform 0.1s',
                        whiteSpace: 'nowrap',
                        opacity: 0.85
                    }}
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
                >
                    {meshToBinaryMap[meshKey]}
                </div>
            </Html>
        </group>
    );
}

export function BrainModel({
    activeSection,
    onSectionClick,
    socketRefs
}: {
    activeSection: number | null;
    onSectionClick: (id: number | null) => void;
    socketRefs?: SocketRefs;
}) {
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

    useFrame((state, delta) => {
        const time = state.clock.elapsedTime;
        if (!groupRef.current) return;

        if (!activeSection) {
            // Constrain rotation to oscillate between -30 and 15 degrees
            const minAngle = -30 * (Math.PI / 180);
            const maxAngle = 15 * (Math.PI / 180);
            const midPoint = (maxAngle + minAngle) / 2;
            const amplitude = (maxAngle - minAngle) / 2;

            groupRef.current.rotation.y = midPoint + Math.sin(time * 0.2) * amplitude;
            groupRef.current.rotation.x = 0;
            groupRef.current.rotation.z = 0;
        } else {
            // Settle to a fixed neutral pose so the selected lobe's on-screen
            // position is deterministic once BrainCanvas locks the camera onto it.
            groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, 0, 6, delta);
            groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, 0, 6, delta);
            groupRef.current.rotation.z = THREE.MathUtils.damp(groupRef.current.rotation.z, 0, 6, delta);
        }
    });

    const { scale, position } = useSpring({
        scale: activeSection ? 1.95 : 1.56,
        position: (activeSection ? [0, -0.5, 0] : [0, 0, 0]) as [number, number, number],
        config: { mass: 1, tension: 170, friction: 30 }
    });

    const lobes: { name: string; key: MeshKey }[] = [
        { name: 'brain_Frontal_0', key: 'Frontal' },
        { name: 'brain_Parietal_0', key: 'Parietal' },
        { name: 'brain_Occipital_0', key: 'Occipital' },
        { name: 'brain_Temporal_0', key: 'Temporal' },
        { name: 'brain_cerebellum_0', key: 'cerebellum' },
    ];

    return (
        <a.group ref={groupRef} position={position} scale={scale}>
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
                                    isActive={activeSection === order}
                                    isHovered={hoveredMesh === key}
                                    socketRef={socketRefs?.[order]}
                                    onHover={setHoveredMesh}
                                    onClick={() => onSectionClick(activeSection === order ? null : order)}
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
        </a.group>
    );
}

useGLTF.preload('/brain2.glb');
