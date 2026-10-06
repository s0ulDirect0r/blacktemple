import Stripe from 'stripe';

let client: Stripe | null = null;

/**
 * Created on first use so builds don't need STRIPE_SECRET_KEY. Live keys
 * charge real cards, so only the production deployment may use one; local dev
 * and preview deployments must use a test key.
 */
export function stripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
    if (/^(sk|rk)_live_/.test(key) && process.env.VERCEL_ENV !== 'production') {
      throw new Error('STRIPE_SECRET_KEY is a live key; use a test key outside the production deployment');
    }
    client = new Stripe(key);
  }
  return client;
}
