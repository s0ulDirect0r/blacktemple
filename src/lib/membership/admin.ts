import { membershipDatabase } from './database';

export interface AdminMember {
  id: string;
  name: string;
  email: string;
  verified: boolean;
  emailUpdates: boolean;
  joinedAt: string;
  supportedCents: number;
}

export interface AdminSupporterPayment {
  sessionId: string;
  email: string | null;
  memberName: string | null;
  amountCents: number;
  currency: string;
  livemode: boolean;
  paidAt: string;
}

/** Everyone with an account, newest first, with their ESCALATION support. */
export async function adminMembers(): Promise<AdminMember[]> {
  const { rows } = await membershipDatabase().query(
    `SELECT u.id, u.name, u.email, u."emailVerified" AS verified, u."emailUpdates" AS email_updates, u."createdAt" AS joined_at,
            COALESCE((SELECT sum(s.amount_cents) FROM escalation_supporters s
                      WHERE s.user_id = u.id OR (s.user_id IS NULL AND u."emailVerified" AND lower(s.email) = lower(u.email))), 0) AS supported_cents
     FROM member_user u ORDER BY u."createdAt" DESC`,
  );
  return rows.map(row => ({
    id: row.id, name: row.name, email: row.email, verified: row.verified, emailUpdates: row.email_updates === true,
    joinedAt: new Date(row.joined_at).toISOString(), supportedCents: Number(row.supported_cents),
  }));
}

/** Every recorded ESCALATION early-access payment, newest first. */
export async function adminSupporterPayments(): Promise<AdminSupporterPayment[]> {
  const { rows } = await membershipDatabase().query(
    `SELECT s.stripe_session_id, s.email, s.amount_cents, s.currency, s.livemode, s.paid_at, u.name AS member_name
     FROM escalation_supporters s
     LEFT JOIN member_user u ON u.id = s.user_id OR (s.user_id IS NULL AND u."emailVerified" AND lower(u.email) = lower(s.email))
     ORDER BY s.paid_at DESC`,
  );
  return rows.map(row => ({
    sessionId: row.stripe_session_id, email: row.email, memberName: row.member_name, amountCents: row.amount_cents,
    currency: row.currency, livemode: row.livemode, paidAt: new Date(row.paid_at).toISOString(),
  }));
}
