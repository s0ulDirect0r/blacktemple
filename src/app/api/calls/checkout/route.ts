import { NextResponse } from 'next/server';
import { parseCheckoutInput, startCheckout } from '@/lib/calls/checkout';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const parsed = parseCheckoutInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const result = await startCheckout(parsed.input, new URL(request.url).origin);
    if (!result.ok) {
      return NextResponse.json({ error: 'That time was just taken. Please pick another.' }, { status: 409 });
    }
    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error('[calls] failed to start checkout:', error);
    return NextResponse.json({ error: 'Something went wrong starting checkout. Please try again.' }, { status: 500 });
  }
}
