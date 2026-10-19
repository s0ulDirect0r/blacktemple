import { NextResponse } from 'next/server';
import type Stripe from 'stripe';

import { stripe } from '@/lib/calls/stripe';
import { dispatchCheckoutEvent } from '@/lib/support/webhook';

/**
 * Stripe webhook. Subscribe the endpoint to checkout.session.completed,
 * checkout.session.async_payment_succeeded and checkout.session.expired.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');
  if (!secret || !signature) return NextResponse.json({ error: 'Not configured.' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    // Signature errors may contain the raw payload; never log payer details.
    console.warn('[calls] rejected webhook with bad signature');
    return NextResponse.json({ error: 'Bad signature.' }, { status: 400 });
  }

  try {
    // Await the ledger write before acknowledging. Stripe retries any failure,
    // and duplicate deliveries are harmless under the support ledger constraints.
    await dispatchCheckoutEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    // A 500 makes Stripe retry, and confirmation is idempotent.
    console.error(`[calls] webhook ${event.type} failed:`, error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Handler failed.' }, { status: 500 });
  }
}
