import { NextResponse } from 'next/server';
import { isSameOrigin, rejectBots } from '@/lib/bot-guard';
import { startInterviewsCheckout } from '@/lib/interviews/checkout';

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Invalid request.' }, { status: 403 });
  const blocked = await rejectBots();
  if (blocked) return blocked;

  try {
    const url = await startInterviewsCheckout(new URL(request.url).origin);
    return NextResponse.json({ url });
  } catch (error) {
    console.error('[interviews] failed to start checkout:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Something went wrong starting checkout. Please try again.' }, { status: 500 });
  }
}
