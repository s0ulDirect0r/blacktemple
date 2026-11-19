// The business offer on /interviews.

export const INTERVIEWS = {
  title: 'Customer Desire Interviews',
  priceLabel: '$1,500',
  interviewCount: 5,
  /**
   * Stripe payment link for the $1,500 offer. Set NEXT_PUBLIC_INTERVIEWS_PAYMENT_LINK
   * once the link exists in Stripe; until then the page shows the button as unavailable.
   */
  paymentLink: process.env.NEXT_PUBLIC_INTERVIEWS_PAYMENT_LINK ?? '',
} as const;
