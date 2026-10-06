// The offer on /calls and the rules for when it can be booked.

export const CALL = {
  title: 'Call with Matthew D. Huff',
  /** Calendar time each booking blocks; the page promises 60–90 minutes. */
  durationMinutes: 90,
  priceCents: 10_000,
  currency: 'usd',
  /** Earliest a slot can be booked, measured from now. */
  minNoticeHours: 24,
  /** How far ahead the page offers slots. */
  horizonDays: 21,
  /**
   * How long an unpaid checkout keeps its slot. Stripe's minimum Checkout
   * lifetime is 30 minutes (31 leaves room for clock skew); the hold outlives
   * it so a slot is never released while someone can still pay for it.
   */
  checkoutMinutes: 31,
  holdMinutes: 35,
} as const;

export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

export const CALL_DURATION_MS = CALL.durationMinutes * MINUTE_MS;

export function formatPrice(cents: number = CALL.priceCents): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: CALL.currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
