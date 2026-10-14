import type Stripe from 'stripe';
import { membershipDatabase } from '@/lib/membership/database';
import { membershipStripe } from '@/lib/membership/stripe';
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
    session.livemode === (process.env.MEMBERSHIP_BILLING_MODE === 'live') && Boolean(session.payment_intent);
}

// A separate, minimal bookkeeping ledger. Never touches member/customer/access tables.
export async function recordSupport(session: Stripe.Checkout.Session) {
  if (!paidSupport(session)) return false;
  const intent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent!.id;
  await membershipDatabase().query(`INSERT INTO support_payments(checkout_session_id,payment_intent_id,amount_cents,currency,livemode)
    VALUES ($1,$2,$3,'usd',$4) ON CONFLICT (checkout_session_id) DO NOTHING`,
  [session.id, intent, session.amount_total, session.livemode]);
  return true;
}

interface SupportDependencies {
  retrieve: (id: string) => Promise<Stripe.Checkout.Session>;
  record: typeof recordSupport;
}
const deps: SupportDependencies = { retrieve: (id: string) => membershipStripe().checkout.sessions.retrieve(id), record: recordSupport };

/** Existing signed webhook queue retries failures; the ledger also deduplicates page/webhook races. */
export async function handleSupportEvent(event: Stripe.Event, dependencies = deps): Promise<boolean> {
  if (!event.type.startsWith('checkout.session.')) return false;
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.metadata?.app !== SUPPORT_APP) return false;
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
