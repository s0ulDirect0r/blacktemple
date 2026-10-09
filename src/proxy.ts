import { NextRequest, NextResponse } from 'next/server';
import { CALLS_AVAILABLE } from '@/lib/calls/access';
import { getSessionCookie } from 'better-auth/cookies';

/** Pause new bookings while leaving existing checkout confirmations intact. */
export function proxy(request: NextRequest) {
  if (!CALLS_AVAILABLE && request.nextUrl.pathname === '/calls') {
    const home = new URL('/', request.url);
    return NextResponse.redirect(home, 307);
  }

  if (!CALLS_AVAILABLE && (request.nextUrl.pathname === '/api/calls/slots' || request.nextUrl.pathname === '/api/calls/checkout')) {
    return NextResponse.json(
      { error: 'Call bookings are temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const path = request.nextUrl.pathname;
  if (path === '/login' || path.startsWith('/login/')) {
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('Referrer-Policy', 'no-referrer');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }
  if (path === '/members' || path.startsWith('/members/') || path === '/membership/checkout' || path === '/membership/return') {
    // This is only an optimistic redirect. Every page/API verifies the database session.
    if (!getSessionCookie(request, { cookiePrefix: 'blacktemple_member' })) {
      const login = new URL('/login', request.url);
      login.searchParams.set('next', path + request.nextUrl.search);
      const response = NextResponse.redirect(login);
      response.headers.set('Cache-Control', 'private, no-store');
      return response;
    }
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login/:path*', '/calls', '/api/calls/slots', '/api/calls/checkout', '/members/:path*', '/membership/checkout', '/membership/return'],
};
