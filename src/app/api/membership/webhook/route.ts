import { after } from 'next/server';
import { drainMembershipEvents, enqueueMembershipEvent } from '@/lib/membership/jobs';
import { membershipStripe } from '@/lib/membership/stripe';

export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  const secret = process.env.MEMBERSHIP_STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');
  if (!secret) return Response.json({ error: 'Membership webhook is not configured.' }, { status: 503 });
  if (!signature) return Response.json({ error: 'Signature required.' }, { status: 400 });
  let event;
  try { event = membershipStripe().webhooks.constructEvent(await request.text(), signature, secret); }
  catch { return Response.json({ error: 'Invalid webhook signature.' }, { status: 400 }); }
  try {
    const result = await enqueueMembershipEvent(event);
    after(async () => { try { await drainMembershipEvents(); } catch { console.error('[membership] event worker needs retry'); } });
    return Response.json({ received: true, ...result });
  }
  catch (error) {
    console.error('[membership] webhook failed:', event.id, error instanceof Error ? error.name : 'UnknownError');
    return Response.json({ error: 'Event processing needs to be retried.' }, { status: 500 });
  }
}
