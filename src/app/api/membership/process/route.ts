import { processNextMembershipEvent } from '@/lib/membership/jobs';
import { processNextAccountEmail } from '@/lib/membership/email';
import { membershipQueueHealth, recoveryAuthorization } from '@/lib/membership/recovery';
import { checkQueueAlerts } from '@/lib/membership/alerts';

export const runtime = 'nodejs';
export const maxDuration = 60;
const headers = { 'Cache-Control': 'private, no-store' };
/** Recovery hook for an authenticated operator/scheduler; never callable by a member. */
export async function GET(request: Request) {
  const authorization = recoveryAuthorization(request.headers.get('authorization'), process.env);
  if (authorization === 'unconfigured') return Response.json({ error: 'Worker scheduling is not configured.' }, { status: 503, headers });
  if (authorization !== 'authorized') return Response.json({ error: 'Unauthorized.' }, { status: 401, headers });
  // A manually approved hosted-sandbox runner cannot mutate a live/production queue.
  if (request.headers.get('x-membership-recovery-mode') === 'sandbox' && (process.env.MEMBERSHIP_BILLING_MODE !== 'test' || process.env.VERCEL_ENV !== 'preview' || process.env.MEMBERSHIP_LIVE_ENABLED === 'true')) return Response.json({ error: 'Hosted preview sandbox recovery required.' }, { status: 409, headers });
  const started = Date.now();
  let billing = 0, email = 0;
  try {
    while (Date.now() - started < 20000 && billing + email < 20) {
      const event = await processNextMembershipEvent();
      if (event) billing++;
      if (Date.now() - started >= 20000 || billing + email >= 20) break;
      const message = await processNextAccountEmail();
      if (message) email++;
      if (!event && !message) break;
    }
    // Alerting must never turn a successful recovery run into a failure.
    const alert = await checkQueueAlerts().catch(() => { console.error('[membership] queue alert check failed'); return 'error' as const; });
    return Response.json({ processed: billing + email, billing, email, alert, billingMode: process.env.MEMBERSHIP_BILLING_MODE === 'test' ? 'test' : 'live', deploymentEnvironment: process.env.VERCEL_ENV ?? 'local', queues: await membershipQueueHealth() }, { headers });
  } catch {
    console.error('[membership] recovery or queue health check failed');
    return Response.json({ error: 'Recovery needs operator review.' }, { status: 503, headers });
  }
}
