// Interviews checkout: one fixed-price Stripe Checkout session, built inline
// like the /calls booking (price_data, no Stripe product or price to create).
// No bookkeeping table: Matthew follows up by email after payment. The session
// carries no bookingId, so the shared payments webhook ignores it.

import type Stripe from 'stripe';

import { stripe } from '@/lib/calls/stripe';
import { INTERVIEWS } from './config';

export async function startInterviewsCheckout(origin: string): Promise<string> {
  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: INTERVIEWS.currency,
          unit_amount: INTERVIEWS.priceCents,
          product_data: {
            name: INTERVIEWS.title,
            description: `${INTERVIEWS.interviewCount} customer interviews, a one-page readout and a rewritten pitch`,
          },
        },
      },
    ],
    metadata: { offer: INTERVIEWS.offer },
    payment_intent_data: { description: INTERVIEWS.title, metadata: { offer: INTERVIEWS.offer } },
    success_url: `${origin}/interviews/booked?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/interviews`,
  });
  if (!session.url) throw new Error(`Stripe returned no URL for session ${session.id}`);
  return session.url;
}

/** A session from this offer, paid in full. */
export function isPaidInterviewsSession(session: Stripe.Checkout.Session): boolean {
  return (
    session.metadata?.offer === INTERVIEWS.offer &&
    session.payment_status === 'paid' &&
    session.amount_total === INTERVIEWS.priceCents &&
    session.currency === INTERVIEWS.currency
  );
}
