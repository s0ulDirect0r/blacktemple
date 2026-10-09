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
    const name = error instanceof Error ? error.name : 'UnknownError';
    await membershipDatabase().query("UPDATE membership_webhook_jobs SET status='pending',lease_until=NULL,available_at=NOW()+$2*INTERVAL '1 second',last_error=$3 WHERE stripe_event_id=$1 AND status='processing' AND attempts=$4",[job.stripe_event_id,retrySeconds,name,job.attempts+1]);
    console.error('[membership] queued event will retry:',job.stripe_event_id,name);
  }
  return true;
}
