import { NextResponse } from 'next/server';
import { getOpenSlots } from '@/lib/calls/availability';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const slots = await getOpenSlots();
    return NextResponse.json(
      { slots: slots.map((slot) => slot.toISOString()) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('[calls] failed to load slots:', error);
    return NextResponse.json({ error: 'Could not load open times.' }, { status: 500 });
  }
}
