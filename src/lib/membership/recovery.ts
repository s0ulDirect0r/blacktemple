import { createHash, timingSafeEqual } from 'node:crypto';
import { membershipDatabase } from './database';

type Environment = Readonly<Record<string, string | undefined>>;
export function recoveryAuthorization(header: string | null, env: Environment) {
  const secrets = [env.MEMBERSHIP_JOB_SECRET, env.CRON_SECRET].filter((value): value is string => Boolean(value));
  if (!secrets.length) return 'unconfigured' as const;
  const supplied = createHash('sha256').update(header ?? '').digest();
  let authorized = false;
  // Fixed-length digest comparison avoids exposing secret length; inspect every configured key.
  for (const secret of secrets) {
    const expected = createHash('sha256').update('Bearer ' + secret).digest();
    const matches = timingSafeEqual(supplied, expected);
    authorized = matches || authorized;
  }
  return authorized ? 'authorized' as const : 'unauthorized' as const;
}

export type QueueHealth = { pending: number; ready: number; processing: number; expiredLeases: number; failed: number; retrying: number; oldestPendingSeconds: number | null };
export async function membershipQueueHealth() {
  // Only aggregate operational fields leave the database; no user, token, payload or error text.
  const query = (table: 'membership_webhook_jobs' | 'member_email_jobs') => membershipDatabase().query<QueueHealth>(`
    SELECT COUNT(*) FILTER (WHERE status='pending')::int AS pending,
      COUNT(*) FILTER (WHERE status='pending' AND available_at<=NOW())::int AS ready,
      COUNT(*) FILTER (WHERE status='processing')::int AS processing,
      COUNT(*) FILTER (WHERE status='processing' AND lease_until<NOW())::int AS "expiredLeases",
      COUNT(*) FILTER (WHERE status='failed')::int AS failed,
      COUNT(*) FILTER (WHERE status='pending' AND last_error IS NOT NULL)::int AS retrying,
      FLOOR(EXTRACT(EPOCH FROM NOW()-MIN(created_at) FILTER (WHERE status='pending')))::int AS "oldestPendingSeconds"
    FROM ${table}`);
  const [billing, email] = await Promise.all([query('membership_webhook_jobs'), query('member_email_jobs')]);
  return { billing: billing.rows[0], email: email.rows[0] };
}

export type RecoveryOptions = { origin: string; invocations: number; intervalSeconds: number; timeboxSeconds: number };
export function recoveryOptions(env: Environment): RecoveryOptions {
  if (env.MEMBERSHIP_RECOVERY_APPROVED !== 'true' || env.MEMBERSHIP_RECOVERY_TARGET_ENV !== 'preview' || env.MEMBERSHIP_BILLING_MODE !== 'test' || env.MEMBERSHIP_LIVE_ENABLED === 'true') throw new Error('Recovery requires explicitly approved preview sandbox configuration.');
  const origin = new URL(env.MEMBERSHIP_RECOVERY_ORIGIN ?? '');
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash || ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)) throw new Error('Recovery requires an exact public HTTPS staging origin.');
  if (!env.MEMBERSHIP_JOB_SECRET || env.MEMBERSHIP_JOB_SECRET.length < 32) throw new Error('A configured membership recovery credential is required.');
  const invocations = Number(env.MEMBERSHIP_RECOVERY_INVOCATIONS ?? '1');
  const intervalSeconds = Number(env.MEMBERSHIP_RECOVERY_INTERVAL_SECONDS ?? '60');
  const timeboxSeconds = Number(env.MEMBERSHIP_RECOVERY_TIMEBOX_SECONDS ?? '1200');
  if (!Number.isInteger(invocations) || invocations < 1 || invocations > 20 || !Number.isInteger(intervalSeconds) || intervalSeconds < 60 || intervalSeconds > 1200 || !Number.isInteger(timeboxSeconds) || timeboxSeconds < 1 || timeboxSeconds > 1200) throw new Error('Recovery is limited to 20 invocations, at least 60 seconds apart, within 20 minutes.');
  return { origin: origin.origin, invocations, intervalSeconds, timeboxSeconds };
}

export async function runBoundedRecovery(env: Environment, transport: typeof fetch = fetch, report: (value: unknown) => void = console.log) {
  const options = recoveryOptions(env);
  const start = Date.now();
  for (let index = 0; index < options.invocations; index++) {
    if (index) {
      const remaining = options.timeboxSeconds * 1000 - (Date.now() - start);
      if (remaining <= options.intervalSeconds * 1000) break;
      await new Promise(resolve => setTimeout(resolve, options.intervalSeconds * 1000));
    }
    const remaining = options.timeboxSeconds * 1000 - (Date.now() - start);
    if (remaining <= 0) break;
    const headers: Record<string, string> = { Authorization: 'Bearer ' + env.MEMBERSHIP_JOB_SECRET, 'X-Membership-Recovery-Mode': 'sandbox' };
    if (env.VERCEL_AUTOMATION_BYPASS_SECRET) headers['x-vercel-protection-bypass'] = env.VERCEL_AUTOMATION_BYPASS_SECRET;
    const response = await transport(options.origin + '/api/membership/process', { headers, redirect: 'error', signal: AbortSignal.timeout(Math.min(55000, remaining)) });
    if (!response.ok) throw new Error('Recovery endpoint rejected the request; inspect protected server logs without publishing credentials.');
    const result = await response.json();
    if (result.billingMode !== 'test' || result.deploymentEnvironment !== 'preview') throw new Error('Recovery endpoint did not confirm hosted preview sandbox environment.');
    // Allowlist numeric summaries only; never print arbitrary remote responses.
    const numeric = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
    const health = (value: Record<string, unknown> | undefined) => Object.fromEntries(['pending', 'ready', 'processing', 'expiredLeases', 'failed', 'retrying', 'oldestPendingSeconds'].map(key => [key, numeric(value?.[key])]));
    report({ invocation: index + 1, processed: numeric(result.processed), billing: numeric(result.billing), email: numeric(result.email), queues: { billing: health(result.queues?.billing), email: health(result.queues?.email) } });
  }
}
