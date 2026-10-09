export const MEMBERSHIP_TERM_MONTHS = 3;
export const MEMBERSHIP_TERMS_VERSION = 'membership-draft-v1';
export const MEMBERSHIP_SUPPORT_EMAIL = 'matthewhuff89@gmail.com';

export const TIERS = [
  {
    id: 'witness', name: 'Witness', monthlyCents: 2000, rank: 1,
    invitation: 'Come close to the work.',
    description: 'A place inside the studio, following the games, art, and writing as they take shape.',
    benefits: ['Members creative archive', 'One studio dispatch each month'],
  },
  {
    id: 'companion', name: 'Companion', monthlyCents: 10000, rank: 2,
    invitation: 'Bring your own spark.',
    description: 'Share the room with other people making things, asking questions, and following what lights them up.',
    benefits: ['Everything in Witness', 'One 60-minute group creative studio gathering each month', 'A space to share work and see what others are making'],
  },
  {
    id: 'champion', name: 'Champion', monthlyCents: 100000, rank: 3,
    invitation: 'Make room for what matters.',
    description: 'Support the world of Black Temple, with time together to explore your desires or champion your creative work.',
    benefits: ['Everything in Companion', 'One private 45-minute conversation each month', 'Choose a Desire Confessional or creative championing'],
  },
] as const;

export type TierId = typeof TIERS[number]['id'];
export type Feature = 'studio' | 'gatherings' | 'conversations';
export function tierById(id: unknown) { return TIERS.find(tier => tier.id === id); }
export function isTierId(id: unknown): id is TierId { return Boolean(tierById(id)); }
export function priceFor(tier: TierId) { return tierById(tier)!.monthlyCents; }
export function money(cents: number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100); }
export function capacityFor(tier: TierId): number | null {
  if (tier === 'witness') return null;
  const raw = process.env[`MEMBERSHIP_CAPACITY_${tier.toUpperCase()}`];
  const capacity = raw === undefined ? (tier === 'companion' ? 12 : 3) : Number(raw);
  if (!Number.isSafeInteger(capacity) || capacity < 1) throw new Error('Invalid membership capacity configuration');
  return capacity;
}

export interface MembershipAccess {
  tier: TierId;
  status: string;
  term_start: Date | null;
  term_end: Date | null;
  paid_through: Date | null;
  revoked_at: Date | null;
}

export function hasAccess(membership: MembershipAccess | null, feature: Feature = 'studio', now = new Date()): boolean {
  // A canceled member keeps what they already paid for; paid_through still bounds access.
  if (!membership || !['active', 'past_due', 'canceled'].includes(membership.status) || membership.revoked_at) return false;
  if (!membership.term_start || !membership.term_end || !membership.paid_through) return false;
  if (membership.term_start > now || membership.term_end <= now || membership.paid_through <= now) return false;
  const minimumRank = { studio: 1, gatherings: 2, conversations: 3 }[feature];
  return tierById(membership.tier)!.rank >= minimumRank;
}

/** A later invoice cannot bridge an unpaid month or extend the fixed term. */
export function paidCoverage(termStart: Date, termEnd: Date, periods: { start: Date; end: Date }[]): Date | null {
  let through = termStart;
  for (const period of [...periods].sort((a,b) => a.start.getTime() - b.start.getTime())) {
    if (period.start < termStart || period.end > termEnd || period.end <= period.start) continue;
    if (period.start > through) break;
    if (period.end > through) through = period.end;
  }
  return through > termStart ? through : null;
}

export function safeReturnPath(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f]/.test(value)) return '/members';
  const url = new URL(value, 'https://blacktemple.invalid');
  return url.origin === 'https://blacktemple.invalid' && (url.pathname === '/members' || url.pathname.startsWith('/members/') || url.pathname === '/membership/checkout') ? url.pathname + url.search : '/members';
}
