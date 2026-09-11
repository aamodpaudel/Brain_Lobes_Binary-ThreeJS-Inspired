import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        const admin = await prisma.admin.findUnique({
            where: { email },
        });

        if (admin && (await verifyPassword(password, admin.passwordHash))) {
            const response = NextResponse.json({ success: true });
            response.cookies.set('adminSession', 'authenticated', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/',
                maxAge: 60 * 60 * 24, // 1 day
            });
            return response;
        }

        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
