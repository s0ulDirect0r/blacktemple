import type Stripe from 'stripe';
import { membershipDatabase, transaction } from './database';
import { handleMembershipEvent } from './billing';

export async function enqueueMembershipEvent(event: Stripe.Event) {
  if (event.livemode !== (process.env.MEMBERSHIP_BILLING_MODE === 'live')) throw new Error('Wrong webhook mode');
  const result = await membershipDatabase().query(`INSERT INTO membership_webhook_jobs(stripe_event_id,event_type,payload)
    VALUES ($1,$2,$3) ON CONFLICT (stripe_event_id) DO NOTHING`, [event.id,event.type,JSON.stringify(event)]);
  return { queued: true, duplicate: result.rowCount === 0 };
}

/** Claim a durable job with a lease. Crashes and concurrent workers are safe. */
export async function processNextMembershipEvent() {
  const job = await transaction(async client => {
    const row = (await client.query<{ stripe_event_id: string; payload: Stripe.Event; attempts: number }>(`SELECT stripe_event_id,payload,attempts
      FROM membership_webhook_jobs WHERE (status='pending' AND available_at<=NOW()) OR (status='processing' AND lease_until<NOW())
      ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`)).rows[0];
    if (!row) return null;
    await client.query("UPDATE membership_webhook_jobs SET status='processing',attempts=attempts+1,lease_until=NOW()+INTERVAL '3 minutes' WHERE stripe_event_id=$1",[row.stripe_event_id]);
    return row;
  });
  if (!job) return false;
  try {
    await handleMembershipEvent(job.payload);
    await membershipDatabase().query("UPDATE membership_webhook_jobs SET status='complete',completed_at=NOW(),lease_until=NULL,last_error=NULL WHERE stripe_event_id=$1 AND status='processing' AND attempts=$2",[job.stripe_event_id,job.attempts+1]);
  } catch (error) {
    const retrySeconds = Math.min(300, Math.pow(2, Math.min(job.attempts,8)) * 5);
    const reason = failureReason(error);
    await membershipDatabase().query("UPDATE membership_webhook_jobs SET status='pending',lease_until=NULL,available_at=NOW()+$2*INTERVAL '1 second',last_error=$3 WHERE stripe_event_id=$1 AND status='processing' AND attempts=$4",[job.stripe_event_id,retrySeconds,reason,job.attempts+1]);
    console.error('[membership] queued event will retry:',job.stripe_event_id,reason);
  }
  return true;
}

/** Each delivery also clears a small backlog, bounded so it fits inside the webhook's time budget. */
export async function drainMembershipEvents(maxJobs = 5, budgetMs = 20000) {
  const started = Date.now();
  let processed = 0;
  while (processed < maxJobs && Date.now() - started < budgetMs && await processNextMembershipEvent()) processed++;
  return processed;
}

/** A bounded, secret-free reason for operators: Stripe's error type and code, otherwise the message. */
export function failureReason(error: unknown) {
  if (!(error instanceof Error)) return 'UnknownError';
  const { type, code } = error as { type?: unknown; code?: unknown };
  const reason = typeof type === 'string' && type.startsWith('Stripe') ? [type, typeof code === 'string' ? code : ''].filter(Boolean).join(':') : `${error.name}: ${error.message}`;
  return reason.replace(/[^\s@]+@[^\s@]+/g, '<email>').replace(/\b(?:sk|rk|pk|whsec|re)_[A-Za-z0-9_]+/g, '<redacted>').slice(0, 200);
}
