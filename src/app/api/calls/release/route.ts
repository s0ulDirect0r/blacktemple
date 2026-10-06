import { NextResponse } from 'next/server';
import { abandonCheckout } from '@/lib/calls/checkout';

/** Called when the buyer returns from Checkout without paying (`/calls?hold=<id>`). */
export async function POST(request: Request) {
  let bookingId: unknown;
  try {
    ({ bookingId } = (await request.json()) as { bookingId?: unknown });
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  if (typeof bookingId !== 'string' || !/^[0-9a-f]{32}$/.test(bookingId)) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  try {
    await abandonCheckout(bookingId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[calls] failed to release hold:', error);
    return NextResponse.json({ error: 'Could not release the hold.' }, { status: 500 });
  }
}
