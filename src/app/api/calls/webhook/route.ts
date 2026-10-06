import { NextResponse } from 'next/server';
import type Stripe from 'stripe';

import { confirmCheckoutSession, releaseExpiredSession } from '@/lib/calls/checkout';
import { stripe } from '@/lib/calls/stripe';

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
  } catch (error) {
    console.warn('[calls] rejected webhook with bad signature:', error);
    return NextResponse.json({ error: 'Bad signature.' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        // Event payloads use the endpoint's API version, which may predate
        // fields like payment_status; fetch the session at the SDK's version.
        await confirmCheckoutSession(await stripe().checkout.sessions.retrieve(event.data.object.id));
        break;
      case 'checkout.session.expired':
        await releaseExpiredSession(event.data.object);
        break;
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    // A 500 makes Stripe retry, and confirmation is idempotent.
    console.error(`[calls] webhook ${event.type} failed:`, error);
    return NextResponse.json({ error: 'Handler failed.' }, { status: 500 });
  }
}
