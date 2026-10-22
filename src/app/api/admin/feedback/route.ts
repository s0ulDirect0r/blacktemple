import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { authConfigured } from '@/lib/membership/auth';
import { adminFeedback } from '@/lib/escalation/feedback';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!await verifyAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!authConfigured()) return NextResponse.json({ items: [], counts: [] }, { headers: { 'Cache-Control': 'no-store' } });
  const params = new URL(request.url).searchParams;
  try {
    const result = await adminFeedback({ kind: params.get('kind'), arena: params.get('arena') });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin] feedback failed:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Could not load feedback.' }, { status: 500 });
  }
}
