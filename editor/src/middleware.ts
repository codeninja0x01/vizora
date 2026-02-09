import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware for optimistic redirects based on session cookie presence
// Real session validation happens in protected layout server component
export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('better-auth.session_token');
  const { pathname } = request.nextUrl;

  // Redirect unauthenticated users from protected routes to login
  if (pathname.startsWith('/dashboard')) {
    if (!sessionCookie) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect authenticated users from auth pages to dashboard
  if (pathname === '/login' || pathname === '/signup') {
    if (sessionCookie) {
      const dashboardUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup'],
};
