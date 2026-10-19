import Stripe from 'stripe';
import { MemberError } from './errors';
import { priceFor, type TierId } from './config';

let client: Stripe | undefined;
export function membershipStripe() {
  const key = process.env.MEMBERSHIP_STRIPE_SECRET_KEY;
  if (!key) throw new MemberError(503, 'Membership checkout is not configured yet.');
  const test = /^(sk|rk)_test_/.test(key);
  if (!test && !(process.env.MEMBERSHIP_BILLING_MODE === 'live' && process.env.MEMBERSHIP_LIVE_ENABLED === 'true' && process.env.VERCEL_ENV === 'production')) throw new MemberError(503, 'Live membership billing has not been activated.');
  if (test && process.env.MEMBERSHIP_BILLING_MODE !== 'test') throw new MemberError(503, 'Membership billing configuration does not match.');
  return client ??= new Stripe(key, { maxNetworkRetries: 2, timeout: 20000 });
}
export async function membershipPrice(tier: TierId) {
  const id = process.env[`MEMBERSHIP_PRICE_${tier.toUpperCase()}`];
  if (!id) throw new MemberError(503, 'This membership is not configured for checkout yet.');
  const price = await membershipStripe().prices.retrieve(id);
  if (!price.active || price.currency !== 'usd' || price.unit_amount !== priceFor(tier) || price.recurring?.interval !== 'month' || price.recurring.interval_count !== 1 || price.livemode !== (process.env.MEMBERSHIP_BILLING_MODE === 'live')) throw new MemberError(503, 'Membership pricing needs to be checked before checkout.');
  return price;
}
export function stripeId(value: string | { id: string } | null | undefined): string | null { return typeof value === 'string' ? value : value?.id ?? null; }
