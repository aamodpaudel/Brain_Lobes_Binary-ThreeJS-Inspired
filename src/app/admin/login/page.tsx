'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--background)' }}>
            <form onSubmit={handleLogin} style={{ border: '1px solid var(--foreground)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', width: '300px' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>Admin Login</h2>
                {error && <p style={{ color: 'red', fontSize: '0.9rem' }}>{error}</p>}
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--foreground)', background: 'transparent', color: 'var(--foreground)' }}
                        required
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--foreground)', background: 'transparent', color: 'var(--foreground)' }}
                        required
                    />
                </div>
                <button type="submit" style={{ marginTop: '1rem', padding: '0.5rem', background: 'var(--foreground)', color: 'var(--background)', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                    Login
                </button>
            </form>
        </div>
    );
}
