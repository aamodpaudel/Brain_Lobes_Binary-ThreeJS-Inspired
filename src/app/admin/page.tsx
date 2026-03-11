'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';
import { CircuitBackground } from '@/components/CircuitBackground';
import katex from 'katex';
import 'katex/dist/katex.min.css';

if (typeof window !== 'undefined') {
    (window as any).katex = katex;
}

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false, loading: () => <p>Loading editor...</p> });

const quillModules = {
    toolbar: [
        [{ 'size': [] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['link', 'formula'],
        ['clean']
    ],
};

function QuillWrapper({ value, onChange }: { value: string, onChange: (val: string) => void }) {
    const [content, setContent] = useState(value);

    useEffect(() => {
        if (value !== content && !content) {
            setContent(value);
        }
    }, [value]);

    return <ReactQuill theme="snow" modules={quillModules} value={content} onChange={(val) => {
        setContent(val);
        onChange(val);
    }} />;
}

type Section = {
    id: number;
    side: string;
    title: string;
    content: string;
    isGlobalProfile: boolean;
    order: number;
};

type GlobalSettings = {
    id: number;
    title: string;
    subtitle: string;
    email: string;
    bio: string;
    instructions: string;
    instructionsBottom: string;
    githubUrl?: string;
    linkedinUrl?: string;
    twitterUrl?: string;
};

export default function AdminDashboard() {
    const [sections, setSections] = useState<Section[]>([]);
    const [settings, setSettings] = useState<GlobalSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [adminPassword, setAdminPassword] = useState('');
    const [settingsPassword, setSettingsPassword] = useState('');

    const [formData, setFormData] = useState<Partial<Section>>({
        side: 'LEFT',
        title: '',
        content: '',
        order: 0,
    });

    const [settingsData, setSettingsData] = useState<Partial<GlobalSettings>>({
        title: '',
        subtitle: '',
        email: '',
        bio: '',
        instructions: '',
        instructionsBottom: '',
        githubUrl: '',
        linkedinUrl: '',
        twitterUrl: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const [resSec, resSet] = await Promise.all([
            fetch('/api/sections'),
            fetch('/api/settings')
        ]);

        if (resSec.ok) {
            setSections(await resSec.json());
        }
        if (resSet.ok) {
            const data = await resSet.json();
            setSettings(data);
            if (data) setSettingsData(data);
        }
        setLoading(false);
    };

    const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setSettingsData({ ...settingsData, [e.target.name]: e.target.value });
    };

    const handleSettingsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!settingsPassword) {
            alert('Admin password required to save Global Settings!');
            return;
        }

        const res = await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...settingsData, adminPassword: settingsPassword }),
        });

        if (res.ok) {
            alert('Global settings updated successfully!');
            setSettingsPassword('');
            fetchData();
        } else {
            const error = await res.json();
            alert(`Error: ${error.error}`);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adminPassword) {
            alert('Admin password confirmation required!');
            return;
        }

        const method = editingId ? 'PUT' : 'POST';
        const body = { ...formData, id: editingId, adminPassword, isGlobalProfile: false };

        const res = await fetch('/api/sections', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (res.ok) {
            fetchData();
            handleCancel();
        } else {
            const error = await res.json();
            alert(`Error: ${error.error}`);
        }
    };

    const handleEdit = (section: Section) => {
        setEditingId(section.id);
        setFormData(section);
        setAdminPassword('');
    };

    const handleDelete = async (id: number) => {
        const pwd = prompt('Enter admin password to confirm deletion:');
        if (!pwd) return;

        const res = await fetch('/api/sections', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, adminPassword: pwd }),
        });

        if (res.ok) fetchData();
        else {
            const error = await res.json();
            alert(`Error: ${error.error}`);
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setFormData({ side: 'LEFT', title: '', content: '', order: 0 });
        setAdminPassword('');
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/';
    };

    if (loading) return <div style={{ width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

    return (
        <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
                <CircuitBackground />
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)' }} />
            </div>

            <div style={{
                position: 'relative',
                zIndex: 1,
                padding: '2rem',
                maxWidth: '1000px',
                margin: '2rem auto',
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                borderRadius: '12px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)',
            }}>
                {/* Safari-like Top Bar */}
                <div style={{
                    width: 'calc(100% + 4rem)', height: '3rem',
                    margin: '-2rem -2rem 2rem -2rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
                    borderTopLeftRadius: '12px', borderTopRightRadius: '12px',
                    display: 'flex', alignItems: 'center', padding: '0 1rem', gap: '8px'
                }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#9e9e9e', border: '1px solid #757575' }}></span>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#bdbdbd', border: '1px solid #9e9e9e' }}></span>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#e0e0e0', border: '1px solid #bdbdbd' }}></span>
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                         <span style={{ fontSize: '11px', color: '#666', fontFamily: 'sans-serif' }}>aamodpaudel.com/admin</span>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ fontWeight: 300, fontSize: '2.5rem', marginTop: 0, color: '#333' }}>Admin Dashboard</h1>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <a href="/" style={{ textDecoration: 'none', color: '#666', fontSize: '0.9rem' }}>Back to Site</a>
                        <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', background: '#333', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Logout</button>
                    </div>
                </div>

                {/* Global Settings Block */}
                <div style={{ marginBottom: '3rem', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '8px', background: 'rgba(255,255,255,0.1)' }}>
                    <h2 style={{ color: '#333', fontWeight: 500 }}>Edit Global Profile Information</h2>
                    <form onSubmit={handleSettingsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <label style={{ flex: 1, color: '#555', fontSize: '0.9rem' }}>
                                Homepage Name (Title):
                                <input name="title" value={settingsData.title || ''} onChange={handleSettingsChange} required style={{ display: 'block', width: '100%', padding: '0.75rem', marginTop: '0.5rem', background: 'rgba(255,255,255,0.5)', color: '#333', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '6px', outline: 'none' }} />
                            </label>
                            <label style={{ flex: 1, color: '#555', fontSize: '0.9rem' }}>
                                Email Address:
                                <input name="email" value={settingsData.email || ''} onChange={handleSettingsChange} required style={{ display: 'block', width: '100%', padding: '0.75rem', marginTop: '0.5rem', background: 'rgba(255,255,255,0.5)', color: '#333', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '6px', outline: 'none' }} />
                            </label>
                        </div>

                        <div style={{ color: '#555', fontSize: '0.9rem' }}>
                            Subtitle (Role / Tagline):
                            <div style={{ marginTop: '0.5rem', background: 'rgba(255,255,255,0.7)', color: '#333', borderRadius: '6px' }}>
                                <QuillWrapper value={settingsData.subtitle || ''} onChange={(val) => setSettingsData({ ...settingsData, subtitle: val })} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <label style={{ flex: 1, color: '#555', fontSize: '0.9rem' }}>
                                GitHub URL:
                                <input name="githubUrl" value={settingsData.githubUrl || ''} onChange={handleSettingsChange} style={{ display: 'block', width: '100%', padding: '0.75rem', marginTop: '0.5rem', background: 'rgba(255,255,255,0.5)', color: '#333', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '6px', outline: 'none' }} placeholder="e.g. https://github.com/..." />
                            </label>
                            <label style={{ flex: 1, color: '#555', fontSize: '0.9rem' }}>
                                LinkedIn URL:
                                <input name="linkedinUrl" value={settingsData.linkedinUrl || ''} onChange={handleSettingsChange} style={{ display: 'block', width: '100%', padding: '0.75rem', marginTop: '0.5rem', background: 'rgba(255,255,255,0.5)', color: '#333', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '6px', outline: 'none' }} placeholder="e.g. https://linkedin.com/in/..." />
                            </label>
                            <label style={{ flex: 1, color: '#555', fontSize: '0.9rem' }}>
                                Twitter/X URL:
                                <input name="twitterUrl" value={settingsData.twitterUrl || ''} onChange={handleSettingsChange} style={{ display: 'block', width: '100%', padding: '0.75rem', marginTop: '0.5rem', background: 'rgba(255,255,255,0.5)', color: '#333', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '6px', outline: 'none' }} placeholder="e.g. https://x.com/..." />
                            </label>
                        </div>

                        <div style={{ color: '#555', fontSize: '0.9rem' }}>
                            Biography Intro Text:
                            <div style={{ marginTop: '0.5rem', background: 'rgba(255,255,255,0.7)', color: '#333', borderRadius: '6px' }}>
                                <QuillWrapper value={settingsData.bio || ''} onChange={(val) => setSettingsData({ ...settingsData, bio: val })} />
                            </div>
                        </div>

                        <div style={{ color: '#555', fontSize: '0.9rem' }}>
                            Above Brain Instructions:
                            <div style={{ marginTop: '0.5rem', background: 'rgba(255,255,255,0.7)', color: '#333', borderRadius: '6px' }}>
                                <QuillWrapper value={settingsData.instructions || ''} onChange={(val) => setSettingsData({ ...settingsData, instructions: val })} />
                            </div>
                        </div>

                        <div style={{ color: '#555', fontSize: '0.9rem' }}>
                            Below Brain Instructions:
                            <div style={{ marginTop: '0.5rem', background: 'rgba(255,255,255,0.7)', color: '#333', borderRadius: '6px' }}>
                                <QuillWrapper value={settingsData.instructionsBottom || ''} onChange={(val) => setSettingsData({ ...settingsData, instructionsBottom: val })} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginTop: '0.5rem' }}>
                            <label style={{ flex: 1, color: '#d32f2f', fontSize: '0.9rem' }}>
                                Admin Password (required to save changes):
                                <input type="password" value={settingsPassword} onChange={(e) => setSettingsPassword(e.target.value)} required style={{ display: 'block', width: '100%', padding: '0.75rem', marginTop: '0.5rem', background: 'rgba(255,255,255,0.5)', color: '#333', border: '1px solid rgba(211,47,47,0.4)', borderRadius: '6px', outline: 'none' }} />
                            </label>
                            <button type="submit" style={{ padding: '0.75rem 2rem', background: '#333', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                                Save Profile
                            </button>
                        </div>
                    </form>
                </div>

                {/* Regional Data Block */}
                <div style={{ marginBottom: '3rem', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '8px', background: 'rgba(255,255,255,0.1)' }}>
                    <h2 style={{ color: '#333', fontWeight: 500 }}>{editingId ? 'Edit Database Section' : 'Add New Brain Section'}</h2>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <label style={{ flex: 1, color: '#555', fontSize: '0.9rem' }}>
                                Hemisphere Side:
                                <select name="side" value={formData.side} onChange={handleChange} style={{ display: 'block', width: '100%', padding: '0.75rem', marginTop: '0.5rem', background: 'rgba(255,255,255,0.5)', color: '#333', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '6px', outline: 'none' }}>
                                    <option value="LEFT">LEFT (Left Panel)</option>
                                    <option value="RIGHT">RIGHT (Right Panel)</option>
                                </select>
                            </label>
                        </div>

                        <label style={{ color: '#555', fontSize: '0.9rem' }}>
                            Section Category Title:
                            <input name="title" value={formData.title} onChange={handleChange} required style={{ display: 'block', width: '100%', padding: '0.75rem', marginTop: '0.5rem', background: 'rgba(255,255,255,0.5)', color: '#333', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '6px', outline: 'none' }} />
                        </label>

                        <div style={{ color: '#555', fontSize: '0.9rem' }}>
                            Content Text:
                            <div style={{ marginTop: '0.5rem', background: 'rgba(255,255,255,0.7)', color: '#333', borderRadius: '6px' }}>
                                <QuillWrapper value={formData.content || ''} onChange={(val) => setFormData({ ...formData, content: val })} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <label style={{ flex: 1, color: '#555', fontSize: '0.9rem' }}>
                                Order ID (1=Frontal, 2=Parietal, 3=Occipital, 4=Temporal, 5=Cerebellum):
                                <input type="number" name="order" value={formData.order} onChange={handleChange} required style={{ display: 'block', width: '100%', padding: '0.75rem', marginTop: '0.5rem', background: 'rgba(255,255,255,0.5)', color: '#333', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '6px', outline: 'none' }} />
                            </label>
                            <label style={{ flex: 1, color: '#d32f2f', fontSize: '0.9rem' }}>
                                Admin Password (required to save):
                                <input type="password" name="adminPassword" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required style={{ display: 'block', width: '100%', padding: '0.75rem', marginTop: '0.5rem', background: 'rgba(255,255,255,0.5)', color: '#333', border: '1px solid rgba(211,47,47,0.4)', borderRadius: '6px', outline: 'none' }} />
                            </label>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button type="submit" style={{ padding: '0.75rem 1.5rem', background: '#333', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                                {editingId ? 'Update Section' : 'Add Section'}
                            </button>
                            {editingId && (
                                <button type="button" onClick={handleCancel} style={{ padding: '0.75rem 1.5rem', background: 'transparent', color: '#555', border: '1px solid #aaa', borderRadius: '6px', cursor: 'pointer' }}>
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                <h2 style={{ color: '#333', fontWeight: 500, marginBottom: '1rem' }}>Existing Interaction Sections</h2>
                <div style={{ overflowX: 'auto', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.4)', padding: '1rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', color: '#555' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.1)' }}>
                                <th style={{ textAlign: 'left', padding: '0.75rem', fontWeight: 600 }}>Side</th>
                                <th style={{ textAlign: 'left', padding: '0.75rem', fontWeight: 600 }}>Lobe Node</th>
                                <th style={{ textAlign: 'left', padding: '0.75rem', fontWeight: 600 }}>Title</th>
                                <th style={{ textAlign: 'right', padding: '0.75rem', fontWeight: 600 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sections.filter(s => !s.isGlobalProfile).map(section => (
                                <tr key={section.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                    <td style={{ padding: '0.75rem' }}>{section.side}</td>
                                    <td style={{ padding: '0.75rem' }}>{section.order}</td>
                                    <td style={{ padding: '0.75rem' }}>{section.title}</td>
                                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                        <button onClick={() => handleEdit(section)} style={{ marginRight: '1rem', background: 'transparent', border: 'none', color: '#0066cc', cursor: 'pointer', textDecoration: 'underline', fontWeight: 500 }}>Edit</button>
                                        <button onClick={() => handleDelete(section.id)} style={{ background: 'transparent', border: 'none', color: '#d32f2f', cursor: 'pointer', textDecoration: 'underline', fontWeight: 500 }}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
