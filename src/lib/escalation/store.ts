import { createHmac, timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { membershipDatabase } from '@/lib/membership/database';
import { dollars, postSignal } from '@/lib/sense/signals';

export const ESCALATION_PRODUCT = 'escalation_early_access';
export const MAX_SAVE_BYTES = 256 * 1024;
const TOKEN_AUDIENCE = 'escalation-checkout';
const TOKEN_ISSUER = 'blacktemple';

/** A key for checkout tokens, derived so it is never the auth secret itself. */
function tokenKey() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error('Membership is not configured');
  return createHmac('sha256', secret).update('escalation-checkout-token').digest();
}

/** Short-lived proof of which member started an ESCALATION checkout. */
export function checkoutToken(userId: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer(TOKEN_ISSUER)
    .setAudience(TOKEN_AUDIENCE)
    .setIssuedAt()
    // Checkout sessions can be paid up to a day after they open.
    .setExpirationTime('25h')
    .sign(tokenKey());
}

export async function memberFromCheckoutToken(token: unknown): Promise<string | null> {
  if (typeof token !== 'string' || !token || token.length > 500) return null;
  try {
    const { payload } = await jwtVerify(token, tokenKey(), { algorithms: ['HS256'], issuer: TOKEN_ISSUER, audience: TOKEN_AUDIENCE });
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

/** Verify a Stripe webhook signature header (`t=…,v1=…`) against the raw body. */
export function validStripeSignature(rawBody: string, header: string | null, secret: string, now = Date.now(), toleranceSeconds = 300) {
  if (!header) return false;
  const parts = header.split(',').map(part => part.split('=') as [string, string]);
  const timestamp = Number(parts.find(([key]) => key === 't')?.[1]);
  if (!Number.isFinite(timestamp) || Math.abs(now / 1000 - timestamp) > toleranceSeconds) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest();
  return parts.some(([key, value]) => {
    if (key !== 'v1' || !/^[0-9a-f]{64}$/.test(value ?? '')) return false;
    return timingSafeEqual(Buffer.from(value, 'hex'), expected);
  });
}

export interface SupporterPayment {
  sessionId: string;
  userId: string | null;
  email: string | null;
  amountCents: number;
  currency: string;
  livemode: boolean;
  paidAt: Date;
}

/** Record a paid early-access checkout once; repeated deliveries are ignored. */
export async function recordSupporterPayment(payment: SupporterPayment) {
  const result = await membershipDatabase().query(
    `INSERT INTO escalation_supporters (stripe_session_id, user_id, email, amount_cents, currency, livemode, paid_at)
     SELECT $1, (SELECT id FROM member_user WHERE id = $2), $3, $4, $5, $6, $7
     ON CONFLICT (stripe_session_id) DO NOTHING`,
    [payment.sessionId, payment.userId, payment.email?.toLowerCase() ?? null, payment.amountCents, payment.currency, payment.livemode, payment.paidAt],
  );
  // Only the first delivery of a payment is news.
  if (result.rowCount) {
    const who = payment.email ?? 'someone';
    await postSignal('supporter', `ESCALATION early access: **${dollars(payment.amountCents, payment.currency)}** from ${who}${payment.livemode ? '' : ' (test)'}`);
  }
}

/** Early-access payments for a member: linked to them, or made with their verified email. */
export async function supportFor(userId: string) {
  const { rows } = await membershipDatabase().query<{ payments: string; cents: string | null }>(
    `SELECT count(*) AS payments, sum(s.amount_cents) AS cents
     FROM escalation_supporters s, member_user u
     WHERE u.id = $1 AND (s.user_id = u.id OR (s.user_id IS NULL AND u."emailVerified" AND lower(s.email) = lower(u.email)))`,
    [userId],
  );
  const payments = Number(rows[0]?.payments ?? 0);
  return { earlyAccess: payments > 0, supporter: Number(rows[0]?.cents ?? 0) > 0 };
}

export async function loadSave(userId: string) {
  const { rows } = await membershipDatabase().query<{ document: unknown; updated_at: Date }>(
    'SELECT document, updated_at FROM escalation_saves WHERE user_id = $1',
    [userId],
  );
  return rows[0] ? { document: rows[0].document, updatedAt: rows[0].updated_at.toISOString() } : null;
}

export async function storeSave(userId: string, document: Record<string, unknown>) {
  const { rows } = await membershipDatabase().query<{ updated_at: Date }>(
    `INSERT INTO escalation_saves (user_id, document, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (user_id) DO UPDATE SET document = EXCLUDED.document, updated_at = NOW()
     RETURNING updated_at`,
    [userId, JSON.stringify(document)],
  );
  return rows[0].updated_at.toISOString();
}
