import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
    const path = request.nextUrl.pathname;

    if (path.startsWith('/admin') && path !== '/admin/login') {
        const sessionCookie = request.cookies.get('adminSession');

        if (!sessionCookie || sessionCookie.value !== 'authenticated') {
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }
    }

    // Redirect /admin/login to /admin if already authed
    if (path === '/admin/login') {
        const sessionCookie = request.cookies.get('adminSession');
        if (sessionCookie && sessionCookie.value === 'authenticated') {
            return NextResponse.redirect(new URL('/admin', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*'],
};
