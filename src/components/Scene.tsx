'use client';

import { Canvas } from '@react-three/fiber';
import { BrainModel } from './BrainModel';
import { useState, useEffect } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useSpring as useWebSpring, a as webA } from '@react-spring/web';

export function Scene() {
    const [activeSection, setActiveSection] = useState<number | null>(null);
    const [sections, setSections] = useState<any[]>([]);

    // New Settings state explicitly replacing the string constants
    const [settings, setSettings] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch('/api/sections').then(res => res.json()),
            fetch('/api/settings').then(res => res.json())
        ]).then(([sectionsData, settingsData]) => {
            setSections(sectionsData);
            setSettings(settingsData);
            setIsLoading(false);
        }).catch(err => {
            console.error(err);
            setIsLoading(false);
        });
    }, []);

    const displayedSections = activeSection
        ? sections.filter(s => s.order === activeSection && !s.isGlobalProfile)
        : [];

    const contentOpacity = useWebSpring({ opacity: displayedSections.length > 0 ? 1 : 0, config: { duration: 300 } });

    const getRegionName = (id: number) => {
        const names = ['Frontal Lobe', 'Parietal Lobe', 'Occipital Lobe', 'Temporal Lobe', 'Cerebellum'];
        return names[id - 1] || 'Details';
    };

    if (isLoading || !settings) {
        return <div style={{ width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
    }

    // The explicit button layout sequence: 1(Frontal), 2(Parietal), 4(Temporal), 5(Cerebellum), 3(Occipital)
    const buttonNavSequence = [
        { id: 1, label: '0001' },
        { id: 2, label: '0010' },
        { id: 4, label: '0100' },
        { id: 5, label: '0101' },
        { id: 3, label: '0011' }
    ];

    // CSS injection for standard rich-text <p> elements without leaking global scope
    const richTextStyles = {
        opacity: 0.9, textAlign: 'left' as const
    };

    // Strip &nbsp; entities that Quill injects for every space — these prevent word-wrapping
    const sanitize = (html: string) => html ? html.replace(/&nbsp;/gi, ' ') : '';

    return (
        <div className="scene-container" style={{ position: 'relative', paddingTop: '6rem' }}>
            {/* Top Navigation Row */}
            <header style={{ position: 'absolute', top: 0, left: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem', zIndex: 10, width: '100%' }}>
                <div style={{ flex: 1 }} />

                {/* Center Toggle Buttons */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flex: 2 }}>
                    {buttonNavSequence.map(btn => (
                        <button
                            key={btn.id}
                            onClick={() => setActiveSection(activeSection === btn.id ? null : btn.id)}
                            style={{
                                padding: '0.4rem 1.2rem',
                                borderRadius: '0',
                                border: '2px solid var(--foreground)',
                                background: activeSection === btn.id ? 'var(--foreground)' : 'var(--background)',
                                color: activeSection === btn.id ? 'var(--background)' : 'var(--foreground)',
                                fontFamily: 'monospace',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                transition: 'all 0.1s ease',
                                boxShadow: activeSection === btn.id ? 'none' : '3px 3px 0px 0px var(--foreground)',
                                transform: activeSection === btn.id ? 'translate(3px, 3px)' : 'none'
                            }}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>

                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                    <a href="/admin" style={{ fontWeight: 'bold' }}>Admin Login</a>
                </div>
            </header>

            <div className="scene-content" style={{ border: '3px solid var(--foreground)', margin: '0 2rem 2rem 2rem', padding: '2rem', boxSizing: 'border-box' }}>
                {/* Left Column (Text & Content) */}
                <div className="left-column">
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.2rem' }}>{settings.title}</h1>
                    <p style={{ fontSize: '1rem', fontStyle: 'italic', marginBottom: '0.5rem', lineHeight: '1.5' }}>
                        {settings.subtitle}
                    </p>
                    <div dangerouslySetInnerHTML={{ __html: sanitize(settings.email) }} className="quill-content" style={{ fontSize: '0.9rem', opacity: 0.9, paddingBottom: '1.5rem', borderBottom: '1px solid var(--foreground)', marginBottom: '1.5rem' }} />

                    {!activeSection ? (
                        <div style={{ fontSize: '1.05rem', lineHeight: '1.6' }}>
                            <div dangerouslySetInnerHTML={{ __html: sanitize(settings.bio) }} className="quill-content" style={{ ...richTextStyles, fontSize: '0.95rem' }} />
                        </div>
                    ) : (
                        <webA.div style={{ ...contentOpacity }}>
                            <h2 style={{ fontSize: '1.6rem', fontWeight: 'bold', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                                {getRegionName(activeSection)} Overview
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                {displayedSections.map(s => (
                                    <div key={s.id} style={{ display: 'flex', flexDirection: 'column', borderLeft: '3px solid var(--foreground)', paddingLeft: '1rem' }}>
                                        <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                            {s.side} Side: {s.title}
                                        </h3>
                                        <div dangerouslySetInnerHTML={{ __html: sanitize(s.content) }} className="quill-content" style={{ lineHeight: '1.6', fontSize: '1rem', textAlign: 'left' }} />
                                    </div>
                                ))}
                            </div>
                        </webA.div>
                    )}
                </div>

                {/* Right Column (Mind Box) */}
                <div className="right-column">
                    {/* Top Instructions moved above the Canvas */}
                    <div dangerouslySetInnerHTML={{ __html: sanitize(settings.instructions) }} className="quill-content" style={{ fontSize: '0.85rem', textAlign: 'center', opacity: 0.8, lineHeight: '1.5', marginBottom: '1rem', width: '100%' }} />

                    <div style={{
                        width: '100%',
                        aspectRatio: '1/1',
                        border: '1px solid var(--foreground)',
                        boxShadow: '6px 6px 0px 0px var(--foreground)',
                        background: 'var(--background)',
                        position: 'relative',
                        overflow: 'hidden',
                        marginBottom: '1rem'
                    }}>
                        <Canvas
                            camera={{ position: [0, 0, 4.5], fov: 50 }}
                            onPointerMissed={() => setActiveSection(null)}
                        >
                            <ambientLight intensity={1.5} />
                            <directionalLight position={[5, 5, 5]} intensity={1} />
                            <BrainModel activeSection={activeSection} onSectionClick={setActiveSection} />
                            <OrbitControls enableZoom={false} enablePan={false} />
                        </Canvas>
                    </div>

                    {/* Bottom Instructions moved below the Canvas */}
                    <div className="quill-content" dangerouslySetInnerHTML={{ __html: sanitize(settings.instructionsBottom) }} style={{ fontSize: '0.85rem', textAlign: 'center', opacity: 0.8, lineHeight: '1.5', fontStyle: 'italic', width: '100%' }} />
                </div>
            </div>
        </div>
    );
}
