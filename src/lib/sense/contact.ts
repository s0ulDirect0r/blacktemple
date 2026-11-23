/** Turning a person's phone number and Telegram username into links that open the conversation in the real app. */

/**
 * A phone number in international form (`+15551234567`), or null if it can't be one.
 * Spaces, dashes, dots and brackets are ignored. Ten digits with no country code are taken as a US number.
 */
export function normalizePhone(value: string): string | null {
  const trimmed = value.trim();
  const digits = trimmed.replace(/[\s().-]/g, '');
  if (!/^\+?\d+$/.test(digits)) return null;
  const full = digits.startsWith('+') ? digits : digits.length === 10 ? `+1${digits}` : digits.length === 11 && digits.startsWith('1') ? `+${digits}` : null;
  return full && /^\+\d{7,15}$/.test(full) ? full : null;
}

/** A Telegram username without the @, from `@name`, `name` or a t.me link; null if it can't be one. */
export function normalizeTelegram(value: string): string | null {
  const name = value.trim().replace(/^https?:\/\/(t\.me|telegram\.me)\//i, '').replace(/^@/, '').replace(/\/$/, '');
  return /^[A-Za-z0-9_]{4,32}$/.test(name) ? name : null;
}

/** A plain email address, lowercased; null if it can't be one. */
export function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : null;
}

export interface ContactLink { app: 'iMessage' | 'WhatsApp' | 'Telegram' | 'Signal' | 'Email'; url: string }

/**
 * One link per app this person can be reached on. iMessage, WhatsApp and Signal need the phone number;
 * Telegram uses the username, or the number when there's no username. Email opens a new message in the mail app.
 */
export function contactLinks(person: { phone: string | null; telegram: string | null; email?: string | null }): ContactLink[] {
  const links: ContactLink[] = [];
  const { phone, telegram } = person;
  if (phone) links.push({ app: 'iMessage', url: `sms:${phone}` });
  if (phone) links.push({ app: 'WhatsApp', url: `https://wa.me/${phone.slice(1)}` });
  if (telegram || phone) links.push({ app: 'Telegram', url: `https://t.me/${telegram ?? phone}` });
  if (phone) links.push({ app: 'Signal', url: `https://signal.me/#p/${phone}` });
  if (person.email) links.push({ app: 'Email', url: `mailto:${person.email}` });
  return links;
}
