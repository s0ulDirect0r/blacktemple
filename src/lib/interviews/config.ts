// The business offer on /interviews.

export const INTERVIEWS = {
  title: 'Customer Desire Interviews',
  interviewCount: 5,
  priceCents: 150_000,
  currency: 'usd',
  /** Marks our Checkout sessions, so the success page only accepts its own. */
  offer: 'customer-desire-interviews',
} as const;

export function formatInterviewsPrice(): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: INTERVIEWS.currency, maximumFractionDigits: 0 }).format(
    INTERVIEWS.priceCents / 100,
  );
}
