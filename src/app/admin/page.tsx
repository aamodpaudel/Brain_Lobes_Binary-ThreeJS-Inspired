import Link from 'next/link';
import { cardClass } from '@/components/admin/adminFormStyles';

const LINKS = [
    { href: '/admin/settings', title: 'Global Settings', description: 'Title, tagline, bio, socials, and the VSCO link.' },
    { href: '/admin/domains', title: 'Domains', description: 'Edit the label, tagline, description, and color for each of the 5 mind boxes.' },
    { href: '/admin/notes', title: 'Notes', description: 'Create, edit, and link the notes that make up each domain\'s graph.' },
];

export default function AdminDashboard() {
    return (
        <div>
            <h1 className="mb-6 text-3xl font-light">Admin Dashboard</h1>
            <div className="grid gap-4 sm:grid-cols-2">
                {LINKS.map((link) => (
                    <Link key={link.href} href={link.href} className={`${cardClass} block hover:opacity-90`}>
                        <h2 className="mb-1 text-lg font-semibold">{link.title}</h2>
                        <p className="text-sm opacity-70">{link.description}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
}
