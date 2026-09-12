'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { inputClass, labelClass, primaryButtonClass } from '@/components/admin/adminFormStyles';

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
        } catch {
            setError('An error occurred');
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center px-4" style={{ background: 'var(--background)' }}>
            <form
                onSubmit={handleLogin}
                className="flex w-full max-w-sm flex-col gap-4 rounded-xl border p-6 shadow-lg"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
            >
                <h1 className="text-center text-2xl font-light">Admin Login</h1>
                {error && <p className="text-center text-sm text-red-500">{error}</p>}

                <div>
                    <label className={labelClass}>Email</label>
                    <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                    <label className={labelClass}>Password</label>
                    <input
                        type="password"
                        className={inputClass}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" className={`${primaryButtonClass} mt-2`} style={{ backgroundColor: 'var(--accent)' }}>
                    Login
                </button>
                <Link href="/" className="text-center text-sm opacity-60 hover:opacity-100">
                    Back to site
                </Link>
            </form>
        </div>
    );
}
