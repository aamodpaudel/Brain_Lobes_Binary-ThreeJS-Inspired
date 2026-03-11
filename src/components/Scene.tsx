'use client';

import { Canvas } from '@react-three/fiber';
import { BrainModel } from './BrainModel';
import { CircuitBackground } from './CircuitBackground';
import { useState, useEffect } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useSpring as useWebSpring, a as webA } from '@react-spring/web';
import { Github, Linkedin, Twitter } from 'lucide-react';
import 'katex/dist/katex.min.css';

export function Scene() {
    const [activeSection, setActiveSection] = useState<number | null>(null);
    const [sections, setSections] = useState<any[]>([]);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    // New Settings state explicitly replacing the string constants
    const [settings, setSettings] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

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

    const handleNext = () => {
        if (activeSection === null) setActiveSection(1);
        else if (activeSection < 5) setActiveSection(activeSection + 1);
    };

    const handlePrev = () => {
        if (activeSection === null) return;
        if (activeSection > 1) setActiveSection(activeSection - 1);
        else setActiveSection(null);
    };

    const getUrl = () => {
        if (!activeSection) return 'aamodpaudel.com';
        const regionUrl = getRegionName(activeSection).split(' ')[0].toLowerCase();
        return `aamodpaudel.com/${regionUrl}`;
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
        <div className="scene-container" style={{ position: 'relative', paddingTop: '2rem' }}>
            <CircuitBackground />

            {/* Global Glass Overlay for Background */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundColor: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', pointerEvents: 'none' }} />

            <div className="scene-content" style={{
                margin: '0 2rem 2rem 2rem',
                boxSizing: 'border-box',
                position: 'relative',
                zIndex: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                borderRadius: '12px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Safari-like Top Bar */}
                <div style={{
                    width: '100%',
                    height: '3rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    borderTopLeftRadius: '12px',
                    borderTopRightRadius: '12px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 1rem',
                    gap: '1rem',
                    position: 'relative',
                    zIndex: 2
                }}>
                    {/* Window Controls (Grays as requested) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#9e9e9e', border: '1px solid #757575' }}></span>  {/* Dark gray */}
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#bdbdbd', border: '1px solid #9e9e9e' }}></span>  {/* Soft gray */}
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#e0e0e0', border: '1px solid #bdbdbd' }}></span>  {/* Softer gray */}
                    </div>

                    {/* Navigation Buttons (< >) */}
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d2d2d2', borderRadius: '4px', overflow: 'hidden', height: '24px' }}>
                        <div
                            onClick={handlePrev}
                            style={{ padding: '0 8px', backgroundColor: '#ffffff', borderRight: '1px solid #d2d2d2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: activeSection !== null ? 'pointer' : 'default', opacity: activeSection !== null ? 1 : 0.5 }}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </div>
                        <div
                            onClick={handleNext}
                            style={{ padding: '0 8px', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: activeSection !== 5 ? 'pointer' : 'default', opacity: activeSection !== 5 ? 1 : 0.5 }}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </div>
                    </div>

                    {/* Theme Toggle (Replaced Sidebar Toggle) */}
                    <div
                        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                        style={{ display: 'flex', alignItems: 'center', marginLeft: '0.25rem', cursor: 'pointer' }}
                    >
                        {theme === 'light' ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                        ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                        )}
                    </div>

                    {/* Address/Search Bar */}
                    <div style={{
                        flex: 1,
                        maxWidth: '450px',
                        margin: '0 auto',
                        backgroundColor: '#ffffff',
                        border: '1px solid #d2d2d2',
                        borderRadius: '6px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                    }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <span style={{ fontSize: '11px', color: '#666', fontFamily: 'sans-serif' }}>{getUrl()}</span>
                    </div>

                    {/* Right action icons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: 'auto' }}>
                        <a href="/admin" style={{
                            fontSize: '11px',
                            fontWeight: 'bold',
                            textDecoration: 'none',
                            color: '#555',
                            backgroundColor: 'rgba(255, 255, 255, 0.4)',
                            border: '1px solid rgba(255, 255, 255, 0.6)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            borderRadius: '12px',
                            padding: '2px 8px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}>
                            Admin
                        </a>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'row', gap: '4rem', padding: '0 2rem 2rem 2rem', width: '100%', alignItems: 'flex-start' }}>
                    {/* Left Column (Text & Content) */}
                    <div className="left-column">
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 300, marginTop: '-1.5rem', marginBottom: '0.2rem', lineHeight: '1.2' }}>{settings.title}</h1>
                        <div dangerouslySetInnerHTML={{ __html: sanitize(settings.subtitle) }} className="quill-content" style={{ fontSize: '1rem', marginBottom: '0.5rem', lineHeight: '1.5' }} />
                        
                        <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: '1.5rem', borderBottom: '1px solid var(--foreground)', marginBottom: '1.5rem' }}>
                            <div dangerouslySetInnerHTML={{ __html: sanitize(settings.email) }} className="quill-content" style={{ fontSize: '0.9rem', opacity: 0.9 }} />
                            
                            {(settings.githubUrl || settings.linkedinUrl || settings.twitterUrl) && (
                                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                                    {settings.githubUrl && (
                                        <a href={settings.githubUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#888', transition: 'color 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', fontSize: '0.9rem' }}>
                                            <Github size={18} />
                                            <span>GitHub Profile</span>
                                        </a>
                                    )}
                                    {settings.linkedinUrl && (
                                        <a href={settings.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#888', transition: 'color 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', fontSize: '0.9rem' }}>
                                            <Linkedin size={18} />
                                            <span>LinkedIn Profile</span>
                                        </a>
                                    )}
                                    {settings.twitterUrl && (
                                        <a href={settings.twitterUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#888', transition: 'color 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', fontSize: '0.9rem' }}>
                                            <Twitter size={18} />
                                            <span>X / Twitter Profile</span>
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>

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
                        <div dangerouslySetInnerHTML={{ __html: sanitize(settings.instructions) }} className="quill-content" style={{ fontSize: '0.85rem', textAlign: 'center', opacity: 0.8, lineHeight: '1.5', marginTop: '-1.5rem', marginBottom: '1rem', width: '100%' }} />

                        <div style={{
                            width: '100%',
                            aspectRatio: '1/1',
                            position: 'relative',
                            overflow: 'visible', /* changed from hidden so glowing labels don't get clipped */
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
                        <div className="quill-content" dangerouslySetInnerHTML={{ __html: sanitize(settings.instructionsBottom) }} style={{ fontSize: '0.85rem', textAlign: 'center', opacity: 0.8, lineHeight: '1.5', width: '100%' }} />
                    </div>
                </div>
            </div>
        </div>
    );
}
