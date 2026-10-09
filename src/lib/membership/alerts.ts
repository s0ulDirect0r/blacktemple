import { lock, membershipDatabase, transaction } from './database';
import { stagingAccountAllowed } from './staging-policy';

type Environment = Readonly<Record<string, string | undefined>>;
export type AlertSignals = {
  billingStuckSeconds: number | null; billingRepeatedFailures: number; staleLeases: number;
  emailFailedRecent: number; emailWaitingSeconds: number | null;
};
export type QueueProblem = { key: string; message: string };
const REPEAT_ALERT_MS = 6 * 3600_000;

/** Time-windowed queue signals; old, already-reviewed failures do not keep alerting. */
export async function alertSignals(): Promise<AlertSignals> {
  const row = (await membershipDatabase().query<AlertSignals>(`SELECT
    (SELECT FLOOR(EXTRACT(EPOCH FROM NOW()-MIN(available_at)))::int FROM membership_webhook_jobs WHERE status='pending' AND available_at<=NOW()) AS "billingStuckSeconds",
    (SELECT COUNT(*)::int FROM membership_webhook_jobs WHERE status='pending' AND attempts>=3) AS "billingRepeatedFailures",
    ((SELECT COUNT(*) FROM membership_webhook_jobs WHERE status='processing' AND lease_until<NOW()-INTERVAL '10 minutes') +
     (SELECT COUNT(*) FROM member_email_jobs WHERE status='processing' AND lease_until<NOW()-INTERVAL '10 minutes'))::int AS "staleLeases",
    (SELECT COUNT(*)::int FROM member_email_jobs WHERE status='failed' AND created_at>NOW()-INTERVAL '1 day') AS "emailFailedRecent",
    (SELECT FLOOR(EXTRACT(EPOCH FROM NOW()-MIN(created_at)))::int FROM member_email_jobs WHERE status='pending') AS "emailWaitingSeconds"`)).rows[0];
  return row;
}

/** Problems that need a person. Keys stay stable while a problem persists, so repeats are suppressed. */
export function queueProblems(signals: AlertSignals): QueueProblem[] {
  const problems: QueueProblem[] = [];
  const minutes = (seconds: number) => Math.floor(seconds / 60);
  if ((signals.billingStuckSeconds ?? 0) > 15 * 60) problems.push({ key: 'billing-stuck', message: `Billing events have been waiting ${minutes(signals.billingStuckSeconds!)} minutes to be processed.` });
  if (signals.billingRepeatedFailures > 0) problems.push({ key: `billing-failing:${signals.billingRepeatedFailures}`, message: `${signals.billingRepeatedFailures} billing event(s) have failed 3 or more times; check last_error in membership_webhook_jobs.` });
  if (signals.staleLeases > 0) problems.push({ key: `stale-leases:${signals.staleLeases}`, message: `${signals.staleLeases} job(s) have been stuck mid-processing for over 10 minutes.` });
  if (signals.emailFailedRecent > 0) problems.push({ key: `email-failed:${signals.emailFailedRecent}`, message: `${signals.emailFailedRecent} account email(s) failed in the last day; members may be unable to verify or reset passwords.` });
  // Reset links expire after 15 minutes, so a short wait already matters.
  if ((signals.emailWaitingSeconds ?? 0) > 5 * 60) problems.push({ key: 'email-waiting', message: `An account email has been waiting ${minutes(signals.emailWaitingSeconds!)} minutes to send.` });
  return problems;
}

/** Record the alert state and decide whether to notify: on any change, or every six hours while a problem persists. */
async function shouldNotify(signature: string, now: Date) {
  return transaction(async client => {
    await lock(client, 'membership-ops-alerts');
    const previous = (await client.query<{ signature: string; sent_at: Date }>("SELECT signature,sent_at FROM membership_ops_alerts WHERE id='queue'")).rows[0];
    if (!signature) {
      if (previous?.signature) await client.query("UPDATE membership_ops_alerts SET signature='',sent_at=$1 WHERE id='queue'", [now]);
      return false;
    }
    if (previous && previous.signature === signature && now.getTime() - previous.sent_at.getTime() < REPEAT_ALERT_MS) return false;
    await client.query("INSERT INTO membership_ops_alerts(id,signature,sent_at) VALUES ('queue',$1,$2) ON CONFLICT (id) DO UPDATE SET signature=EXCLUDED.signature,sent_at=EXCLUDED.sent_at", [signature, now]);
    return true;
  });
}

/** Email the operator about queue problems, or log them when no operator address may receive mail. */
export async function alertOperator(problems: QueueProblem[], env: Environment = process.env, transport: typeof fetch = fetch, now = new Date()) {
  if (!(await shouldNotify(problems.map(problem => problem.key).sort().join('|'), now))) return problems.length ? 'suppressed' : 'clear';
  const text = `Black Temple membership queues need attention:\n\n${problems.map(problem => '- ' + problem.message).join('\n')}\n\nThis alert repeats every six hours while the problems persist.`;
  const recipient = env.MEMBERSHIP_OPS_ALERT_EMAIL, key = env.MEMBERSHIP_EMAIL_RESEND_API_KEY, from = env.MEMBERSHIP_EMAIL_FROM;
  const canSend = recipient && key && from && env.MEMBERSHIP_EMAIL_MODE === 'resend' && env.MEMBERSHIP_EMAIL_SEND_ENABLED === 'true' && stagingAccountAllowed(recipient, env);
  if (!canSend) { console.error('[membership] operator alert (not emailed):', text); return 'logged'; }
  try {
    const response = await transport('https://api.resend.com/emails', { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [recipient], subject: 'Black Temple membership needs attention', text }) });
    if (!response.ok) throw new Error('provider-http-' + response.status);
    return 'emailed';
  } catch (error) {
    console.error('[membership] operator alert could not be emailed:', error instanceof Error ? error.message : 'unknown', text);
    return 'logged';
  }
}

export async function checkQueueAlerts() { return alertOperator(queueProblems(await alertSignals())); }
