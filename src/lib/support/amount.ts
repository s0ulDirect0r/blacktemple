// An initial guardrail, not a suggested contribution. All amounts are USD.
export const SUPPORT_MIN_CENTS = 100;
export const SUPPORT_MAX_CENTS = 100_000;
export const SUPPORT_AMOUNT_ERROR = 'Enter an amount from $1 to $1,000 USD, with at most two decimal places.';

export function supportCents(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{1,4}(\.\d{1,2})?$/.test(value.trim())) return null;
  const [whole, fraction = ''] = value.trim().split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return cents >= SUPPORT_MIN_CENTS && cents <= SUPPORT_MAX_CENTS ? cents : null;
}

export function supportMoney(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}
