'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false, loading: () => <p>Loading editor...</p> });

const quillModules = {
    toolbar: [
        [{ 'header': [1, 2, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['link'],
        ['clean']
    ],
};

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
        instructionsBottom: ''
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
        window.location.href = '/login';
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Admin Dashboard</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <a href="/" style={{ borderBottom: '1px solid var(--foreground)', padding: '0.5rem 0' }}>Back to Site</a>
                    <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', background: 'transparent', color: 'var(--foreground)', border: '1px solid var(--foreground)', cursor: 'pointer' }}>Logout</button>
                </div>
            </div>

            {/* Global Settings Block */}
            <div style={{ marginBottom: '3rem', padding: '1.5rem', border: '1px solid var(--foreground)', background: 'rgba(0,0,0,0.02)' }}>
                <h2>Edit Global Profile Information</h2>
                <form onSubmit={handleSettingsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <label style={{ flex: 1 }}>
                            Homepage Name (Title):
                            <input name="title" value={settingsData.title || ''} onChange={handleSettingsChange} required style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.5rem', background: 'transparent', color: 'var(--foreground)', border: '1px solid var(--foreground)' }} />
                        </label>
                        <label style={{ flex: 1 }}>
                            Email Address:
                            <input name="email" value={settingsData.email || ''} onChange={handleSettingsChange} required style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.5rem', background: 'transparent', color: 'var(--foreground)', border: '1px solid var(--foreground)' }} />
                        </label>
                    </div>

                    <label>
                        Subtitle (Role / Tagline):
                        <input name="subtitle" value={settingsData.subtitle || ''} onChange={handleSettingsChange} required style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.5rem', background: 'transparent', color: 'var(--foreground)', border: '1px solid var(--foreground)' }} />
                    </label>

                    <label>
                        Biography Intro Text:
                        <div style={{ marginTop: '0.5rem', background: 'var(--background)', color: 'var(--foreground)' }}>
                            <ReactQuill theme="snow" modules={quillModules} value={settingsData.bio || ''} onChange={(val) => setSettingsData({ ...settingsData, bio: val })} />
                        </div>
                    </label>

                    <label>
                        Above Brain Instructions:
                        <div style={{ marginTop: '0.5rem', background: 'var(--background)', color: 'var(--foreground)' }}>
                            <ReactQuill theme="snow" modules={quillModules} value={settingsData.instructions || ''} onChange={(val) => setSettingsData({ ...settingsData, instructions: val })} />
                        </div>
                    </label>

                    <label>
                        Below Brain Instructions:
                        <div style={{ marginTop: '0.5rem', background: 'var(--background)', color: 'var(--foreground)' }}>
                            <ReactQuill theme="snow" modules={quillModules} value={settingsData.instructionsBottom || ''} onChange={(val) => setSettingsData({ ...settingsData, instructionsBottom: val })} />
                        </div>
                    </label>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginTop: '0.5rem' }}>
                        <label style={{ flex: 1 }}>
                            Admin Password (required to save changes):
                            <input type="password" value={settingsPassword} onChange={(e) => setSettingsPassword(e.target.value)} required style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.5rem', background: 'transparent', color: 'red', border: '1px solid red' }} />
                        </label>
                        <button type="submit" style={{ padding: '0.5rem 2rem', background: 'var(--foreground)', color: 'var(--background)', border: 'none', cursor: 'pointer', fontWeight: 'bold', height: '37px' }}>
                            Save Profile
                        </button>
                    </div>
                </form>
            </div>

            {/* Regional Data Block */}
            <div style={{ marginBottom: '3rem', padding: '1.5rem', border: '1px solid var(--foreground)' }}>
                <h2>{editingId ? 'Edit Database Section' : 'Add New Brain Section'}</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <label style={{ flex: 1 }}>
                            Hemisphere Side:
                            <select name="side" value={formData.side} onChange={handleChange} style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.5rem', background: 'transparent', color: 'var(--foreground)', border: '1px solid var(--foreground)' }}>
                                <option value="LEFT">LEFT (Left Panel)</option>
                                <option value="RIGHT">RIGHT (Right Panel)</option>
                            </select>
                        </label>
                    </div>

                    <label>
                        Section Category Title:
                        <input name="title" value={formData.title} onChange={handleChange} required style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.5rem', background: 'transparent', color: 'var(--foreground)', border: '1px solid var(--foreground)' }} />
                    </label>

                    <label>
                        Content Text:
                        <div style={{ marginTop: '0.5rem', background: 'var(--background)', color: 'var(--foreground)' }}>
                            <ReactQuill theme="snow" modules={quillModules} value={formData.content || ''} onChange={(val) => setFormData({ ...formData, content: val })} />
                        </div>
                    </label>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <label style={{ flex: 1 }}>
                            Order ID (1=Frontal, 2=Parietal, 3=Occipital, 4=Temporal, 5=Cerebellum):
                            <input type="number" name="order" value={formData.order} onChange={handleChange} required style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.5rem', background: 'transparent', color: 'var(--foreground)', border: '1px solid var(--foreground)' }} />
                        </label>
                        <label style={{ flex: 1 }}>
                            Admin Password (required to save):
                            <input type="password" name="adminPassword" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.5rem', background: 'transparent', color: 'red', border: '1px solid red' }} />
                        </label>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button type="submit" style={{ padding: '0.5rem 1rem', background: 'var(--foreground)', color: 'var(--background)', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                            {editingId ? 'Update Section' : 'Add Section'}
                        </button>
                        {editingId && (
                            <button type="button" onClick={handleCancel} style={{ padding: '0.5rem 1rem', background: 'transparent', color: 'var(--foreground)', border: '1px solid var(--foreground)', cursor: 'pointer' }}>
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <h2>Existing Interaction Sections</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem', fontSize: '0.9rem' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid var(--foreground)' }}>
                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Side</th>
                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Lobe Node</th>
                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Title</th>
                        <th style={{ textAlign: 'right', padding: '0.5rem' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {sections.filter(s => !s.isGlobalProfile).map(section => (
                        <tr key={section.id} style={{ borderBottom: '1px solid var(--foreground)' }}>
                            <td style={{ padding: '0.5rem' }}>{section.side}</td>
                            <td style={{ padding: '0.5rem' }}>{section.order}</td>
                            <td style={{ padding: '0.5rem' }}>{section.title}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                                <button onClick={() => handleEdit(section)} style={{ marginRight: '1rem', background: 'transparent', border: 'none', color: 'var(--foreground)', cursor: 'pointer', textDecoration: 'underline' }}>Edit</button>
                                <button onClick={() => handleDelete(section.id)} style={{ background: 'transparent', border: 'none', color: 'red', cursor: 'pointer', textDecoration: 'underline' }}>Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
