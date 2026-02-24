import { NextResponse } from 'next/server';

export async function POST() {
    const response = NextResponse.json({ success: true });
    // Clear the adminSession cookie by setting maxAge to 0
    response.cookies.set('adminSession', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 0,
    });
    return response;
}
