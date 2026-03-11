'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { CircuitBackground } from '@/components/CircuitBackground';

export default function AdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (res.ok) {
                router.push('/admin');
            } else {
                const data = await res.json();
                setError(data.error || 'Login failed');
            }
        } catch (err) {
            setError('An error occurred');
        }
    };

    return (
        <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Background */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
                <CircuitBackground />
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255, 255, 255, 0.45)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }} />
            </div>

            {/* Window Container */}
            <div style={{
                position: 'relative', zIndex: 1,
                width: '100%', maxWidth: '400px',
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                borderRadius: '12px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden'
            }}>
                {/* Safari-like Top Bar */}
                <div style={{
                    width: '100%', height: '3rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
                    display: 'flex', alignItems: 'center', padding: '0 1rem', gap: '8px'
                }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#9e9e9e', border: '1px solid #757575' }}></span>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#bdbdbd', border: '1px solid #9e9e9e' }}></span>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#e0e0e0', border: '1px solid #bdbdbd' }}></span>
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                         <span style={{ fontSize: '11px', color: '#666', fontFamily: 'sans-serif' }}>aamodpaudel.com/admin/login</span>
                    </div>
                </div>

                {/* Form Content */}
                <form onSubmit={handleLogin} style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: '1rem', fontWeight: 300, fontSize: '1.8rem', color: '#333' }}>Admin Auth</h2>
                    {error && <p style={{ color: 'red', fontSize: '0.9rem', textAlign: 'center' }}>{error}</p>}
                    
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555', fontSize: '0.9rem' }}>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{ 
                                width: '100%', padding: '0.75rem', 
                                border: '1px solid rgba(0,0,0,0.1)', borderRadius: '6px', 
                                background: 'rgba(255,255,255,0.5)', color: '#333',
                                outline: 'none'
                             }}
                            required
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555', fontSize: '0.9rem' }}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ 
                                width: '100%', padding: '0.75rem', 
                                border: '1px solid rgba(0,0,0,0.1)', borderRadius: '6px', 
                                background: 'rgba(255,255,255,0.5)', color: '#333',
                                outline: 'none'
                             }}
                            required
                        />
                    </div>
                    <button type="submit" style={{ 
                        marginTop: '1rem', padding: '0.75rem', 
                        background: '#333', color: '#fff', 
                        border: 'none', borderRadius: '6px', 
                        cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem',
                        transition: 'background 0.2s'
                    }}>
                        Login
                    </button>
                    <a href="/" style={{ textDecoration: 'none', color: '#666', fontSize: '0.85rem', textAlign: 'center', marginTop: '0.5rem' }}>Back to site</a>
                </form>
            </div>
        </div>
    );
}
