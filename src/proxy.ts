import { NextRequest, NextResponse } from 'next/server';
import { CALLS_AVAILABLE } from '@/lib/calls/access';

/** Pause new bookings while leaving existing checkout confirmations intact. */
export function proxy(request: NextRequest) {
  if (CALLS_AVAILABLE) return NextResponse.next();

  if (request.nextUrl.pathname === '/calls') {
    const home = new URL('/', request.url);
    return NextResponse.redirect(home, 307);
  }

  if (request.nextUrl.pathname === '/api/calls/slots' || request.nextUrl.pathname === '/api/calls/checkout') {
    return NextResponse.json(
      { error: 'Call bookings are temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/calls', '/api/calls/slots', '/api/calls/checkout'],
};
