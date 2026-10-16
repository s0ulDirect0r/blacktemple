import type Stripe from 'stripe';
import { stripe } from '@/lib/calls/stripe';

export const SUPPORT_LIVE_ACCOUNT_ID = 'acct_1H21BAFUbUrXDr2T';

/** Support uses the existing Stripe account, with a stricter production gate. */
export function supportConfiguration(env: Record<string, string | undefined> = process.env) {
  const live = env.VERCEL_ENV === 'production';
  const key = env.STRIPE_SECRET_KEY ?? '';
  if (!new RegExp(`^(sk|rk)_${live ? 'live' : 'test'}_`).test(key)) {
    throw new Error('Support Stripe key mode does not match the deployment');
  }
  const accountId = env.SUPPORT_STRIPE_ACCOUNT_ID ?? '';
  if (!/^acct_[a-zA-Z0-9]+$/.test(accountId) || (live && accountId !== SUPPORT_LIVE_ACCOUNT_ID)) {
    throw new Error('Support Stripe account is not configured');
  }
  return { live, accountId };
}

export function supportStripe() {
  supportConfiguration();
  return stripe();
}

/** Check the authenticated account and actual API mode before opening Checkout. */
export async function verifySupportStripe(client: Pick<Stripe, 'accounts' | 'balance'> = supportStripe()) {
  const expected = supportConfiguration();
  const [account, balance] = await Promise.all([client.accounts.retrieve(null), client.balance.retrieve()]);
  if (account.id !== expected.accountId || balance.livemode !== expected.live || !account.charges_enabled) {
    throw new Error('Support Stripe account verification failed');
  }
}

export function supportSiteOrigin(env: Record<string, string | undefined> = process.env) {
  const configured = env.SUPPORT_SITE_ORIGIN;
  if (!configured) throw new Error('Support site origin is not configured');
  const url = new URL(configured);
  if (configured !== url.origin || url.username || url.password ||
      !['http:', 'https:'].includes(url.protocol) ||
      (env.VERCEL_ENV === 'production' && url.protocol !== 'https:')) {
    throw new Error('Support site origin must be an exact origin');
  }
  return url.origin;
}
