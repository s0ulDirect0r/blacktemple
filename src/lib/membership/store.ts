import type { PoolClient } from 'pg';
import { membershipDatabase } from './database';
import type { MembershipAccess, TierId } from './config';

export interface Membership extends MembershipAccess {
  id: string; user_id: string; attempt_id: string; stripe_customer_id: string;
  stripe_subscription_id: string; stripe_schedule_id: string; created_at: Date;
  next_payment_at: Date | null;
}
export interface Attempt {
  id: string; user_id: string; tier: TierId; price_id: string; monthly_cents: number;
  terms_version: string; status: string; stripe_customer_id: string | null;
  checkout_session_id: string | null; checkout_url: string | null; expires_at: Date;
}
export interface Invoice {
  stripe_invoice_id: string; membership_id: string; status: string; currency: string;
  amount_due: number; amount_paid: number; period_start: Date; period_end: Date; hosted_url: string | null;
}
export async function currentMembership(userId: string, client?: PoolClient): Promise<Membership | null> {
  const result = await (client ?? membershipDatabase()).query<Membership>('SELECT * FROM memberships WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1', [userId]);
  return result.rows[0] ?? null;
}
export async function accountSnapshot(userId: string) {
  const membership = await currentMembership(userId);
  const invoices = membership ? (await membershipDatabase().query<Invoice>('SELECT * FROM membership_invoices WHERE membership_id=$1 ORDER BY period_start', [membership.id])).rows : [];
  const pending = (await membershipDatabase().query<Attempt>("SELECT * FROM membership_attempts WHERE user_id=$1 AND status IN ('creating','open','activating') AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1", [userId])).rows[0] ?? null;
  return { membership, invoices, pending };
}
