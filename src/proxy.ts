import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Guards /admin page navigation. API routes check the session themselves
// (see src/lib/auth.ts:isAdminSession) since redirecting a fetch() to an
// HTML login page would break JSON responses.
export function proxy(request: NextRequest) {
    const path = request.nextUrl.pathname;

    if (path.startsWith('/admin') && path !== '/admin/login') {
        const sessionCookie = request.cookies.get('adminSession');

        if (!sessionCookie || sessionCookie.value !== 'authenticated') {
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }
    }

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
