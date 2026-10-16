import type Stripe from 'stripe';
import { sql } from '@/lib/db';
import { supportStripe } from './config';
import { SUPPORT_MAX_CENTS, SUPPORT_MIN_CENTS } from './amount';

export const SUPPORT_APP = 'blacktemple_support';

export function supportCheckoutParams(cents: number, origin: string): Stripe.Checkout.SessionCreateParams {
  if (!Number.isInteger(cents) || cents < SUPPORT_MIN_CENTS || cents > SUPPORT_MAX_CENTS) throw new Error('Invalid support amount');
  const metadata = { app: SUPPORT_APP, amountCents: String(cents) };
  return {
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: cents, product_data: {
      name: 'One-time support for Black Temple',
      description: 'Optional support for Anansi’s work. No membership, services or rewards.',
    } } }],
    metadata,
    payment_intent_data: { metadata, description: 'One-time support for Black Temple' },
    custom_text: { submit: { message: 'One payment only. No subscription, membership, services or rewards.' } },
    success_url: origin + '/support/thanks?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: origin + '/support?checkout=cancelled',
  };
}

export function paidSupport(session: Stripe.Checkout.Session): boolean {
  const amount = session.amount_total;
  return session.metadata?.app === SUPPORT_APP && session.mode === 'payment' && session.status === 'complete' &&
    session.payment_status === 'paid' && session.currency === 'usd' && session.subscription === null &&
    typeof amount === 'number' && Number.isInteger(amount) && amount >= SUPPORT_MIN_CENTS && amount <= SUPPORT_MAX_CENTS &&
    session.metadata.amountCents === String(amount) &&
    session.livemode === (process.env.VERCEL_ENV === 'production') && Boolean(session.payment_intent);
}

// Minimal bookkeeping only. Unique session and intent constraints deduplicate
// concurrent deliveries and confirmation-page requests without granting access.
export async function recordSupport(session: Stripe.Checkout.Session) {
  if (!paidSupport(session)) return false;
  const intent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent!.id;
  await sql`
    INSERT INTO support_payments(checkout_session_id,payment_intent_id,amount_cents,currency,livemode)
    VALUES (${session.id},${intent},${session.amount_total},'usd',${session.livemode})
    ON CONFLICT (checkout_session_id) DO NOTHING
  `;
  return true;
}

interface SupportDependencies {
  retrieve: (id: string) => Promise<Stripe.Checkout.Session>;
  record: typeof recordSupport;
}
const deps: SupportDependencies = { retrieve: (id) => supportStripe().checkout.sessions.retrieve(id), record: recordSupport };

/** The signed webhook awaits this write; a failure returns 500 for Stripe retry. */
export async function handleSupportEvent(event: Stripe.Event, dependencies = deps): Promise<boolean> {
  if (!event.type.startsWith('checkout.session.')) return false;
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.metadata?.app !== SUPPORT_APP) return false;
  if (event.livemode !== (process.env.VERCEL_ENV === 'production')) throw new Error('Wrong support webhook mode');
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const current = await dependencies.retrieve(session.id);
    if (current.payment_status === 'paid' && !(await dependencies.record(current))) throw new Error('Support payment validation failed');
  }
  return true;
}

export type SupportOutcome = { kind: 'paid'; amountCents: number } | { kind: 'paid-pending' | 'unconfirmed' | 'unavailable' };
export async function resolveSupport(sessionId: unknown, dependencies = deps): Promise<SupportOutcome> {
  if (typeof sessionId !== 'string' || !/^cs_(test_|live_)?[a-zA-Z0-9]{1,200}$/.test(sessionId)) return { kind: 'unconfirmed' };
  let session;
  try { session = await dependencies.retrieve(sessionId); }
  catch { return { kind: 'unavailable' }; }
  if (!paidSupport(session)) return { kind: 'unconfirmed' };
  try { await dependencies.record(session); }
  catch { return { kind: 'paid-pending' }; }
  return { kind: 'paid', amountCents: session.amount_total! };
}
