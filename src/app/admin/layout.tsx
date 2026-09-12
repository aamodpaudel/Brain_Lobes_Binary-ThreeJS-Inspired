'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const NAV = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/settings', label: 'Settings' },
    { href: '/admin/domains', label: 'Domains' },
    { href: '/admin/notes', label: 'Notes' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/admin/login');
    };

    return (
        <div className="min-h-screen" style={{ background: 'var(--background)' }}>
            <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <nav className="flex flex-wrap gap-4 text-sm">
                        {NAV.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={pathname === item.href ? 'font-semibold' : 'opacity-60 hover:opacity-100'}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                    <div className="flex items-center gap-4 text-sm">
                        <Link href="/" className="opacity-60 hover:opacity-100">
                            Back to Site
                        </Link>
                        <button onClick={handleLogout} className="rounded-md bg-[color:var(--foreground)] px-3 py-1.5 font-semibold text-[color:var(--background)]">
                            Logout
                        </button>
                    </div>
                </div>
                {children}
            </div>
        </div>
    );
}
