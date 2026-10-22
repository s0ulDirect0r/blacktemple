import { ESCALATION_PRODUCT, memberFromCheckoutToken, recordSupporterPayment, validStripeSignature } from '@/lib/escalation/store';

export const dynamic = 'force-dynamic';

interface CheckoutSessionObject {
  id: string;
  payment_status?: string;
  amount_total?: number | null;
  currency?: string | null;
  created?: number;
  customer_details?: { email?: string | null } | null;
  customer_email?: string | null;
  metadata?: Record<string, string> | null;
}

/**
 * Stripe webhook for ESCALATION early access. Subscribe the endpoint to
 * checkout.session.completed and checkout.session.async_payment_succeeded.
 */
export async function POST(request: Request) {
  const secret = process.env.ESCALATION_STRIPE_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: 'Not configured.' }, { status: 400 });

  const raw = await request.text();
  if (!validStripeSignature(raw, request.headers.get('stripe-signature'), secret)) {
    return Response.json({ error: 'Bad signature.' }, { status: 400 });
  }

  let event: { type?: string; livemode?: boolean; data?: { object?: CheckoutSessionObject } };
  try { event = JSON.parse(raw); } catch { return Response.json({ error: 'Bad payload.' }, { status: 400 }); }

  const session = event.data?.object;
  const settled = session?.payment_status === 'paid' || session?.payment_status === 'no_payment_required';
  if (!session || !['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type ?? '') ||
      session.metadata?.product !== ESCALATION_PRODUCT || !settled) {
    return Response.json({ received: true, ignored: true });
  }

  try {
    await recordSupporterPayment({
      sessionId: session.id,
      userId: await memberFromCheckoutToken(session.metadata?.blacktemple_member),
      email: session.customer_details?.email ?? session.customer_email ?? null,
      amountCents: session.amount_total ?? 0,
      currency: session.currency ?? 'usd',
      livemode: Boolean(event.livemode),
      paidAt: new Date((session.created ?? Date.now() / 1000) * 1000),
    });
    return Response.json({ received: true });
  } catch (error) {
    // A 500 makes Stripe retry; recording is idempotent.
    console.error('[escalation] webhook failed:', error instanceof Error ? error.name : 'UnknownError');
    return Response.json({ error: 'Handler failed.' }, { status: 500 });
  }
}
