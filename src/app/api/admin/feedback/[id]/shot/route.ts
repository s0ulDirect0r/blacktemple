import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { feedbackShot } from '@/lib/escalation/feedback';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await verifyAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const shot = await feedbackShot((await params).id);
  if (!shot) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return new Response(new Uint8Array(shot), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, no-store', 'Content-Security-Policy': "default-src 'none'" },
  });
}
