import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { authConfigured } from '@/lib/membership/auth';
import { adminMembers, adminSupporterPayments } from '@/lib/membership/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!await verifyAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!authConfigured()) return NextResponse.json({ members: [], supporters: [] }, { headers: { 'Cache-Control': 'no-store' } });
  try {
    const [members, supporters] = await Promise.all([adminMembers(), adminSupporterPayments()]);
    return NextResponse.json({ members, supporters }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin] members failed:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Could not load members.' }, { status: 500 });
  }
}
