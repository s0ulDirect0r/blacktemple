// Put a dedicated fixture account into a chosen membership state, for UI review
// and the accessibility suite. Usage:
//   npm run membership:fixtures -- <state> [--allow-remote]
// States: none, pending, witness, companion, champion, past-due, canceled, revoked, expired.
// Needs MEMBERSHIP_FIXTURE_EMAIL and MEMBERSHIP_FIXTURE_PASSWORD (12+ characters).
// Rows use `fixture_` Stripe ids, so no webhook or Stripe call can ever match them.
import 'next/dist/server/node-environment-baseline';
import dotenv from 'dotenv';
import { randomUUID } from 'node:crypto';
import { memberAuth } from '../src/lib/membership/auth';
import { membershipDatabase, transaction } from '../src/lib/membership/database';
import { priceFor, type TierId } from '../src/lib/membership/config';

dotenv.config({ path: '.env.local' });
const FIXTURE_STATES = ['none', 'pending', 'witness', 'companion', 'champion', 'past-due', 'canceled', 'revoked', 'expired'] as const;
type State = typeof FIXTURE_STATES[number];
const DAY = 86400_000;
const addMonths = (date: Date, months: number) => { const next = new Date(date); next.setUTCMonth(next.getUTCMonth() + months); return next; };

function guard() {
  if (process.env.MEMBERSHIP_BILLING_MODE === 'live' || process.env.MEMBERSHIP_LIVE_ENABLED === 'true' || process.env.VERCEL_ENV === 'production') throw new Error('Fixtures never run against live or production configuration');
  const url = process.env.MEMBERSHIP_DATABASE_URL;
  if (!url) throw new Error('MEMBERSHIP_DATABASE_URL is required');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname) && !process.argv.includes('--allow-remote')) throw new Error('Remote fixtures require explicit --allow-remote authorization');
  const email = process.env.MEMBERSHIP_FIXTURE_EMAIL, password = process.env.MEMBERSHIP_FIXTURE_PASSWORD;
  if (!email || !password || password.length < 12) throw new Error('MEMBERSHIP_FIXTURE_EMAIL and a 12+ character MEMBERSHIP_FIXTURE_PASSWORD are required');
  return { email: email.toLowerCase(), password };
}

/** The verified fixture user, created through Better Auth so the password is hashed exactly as in production. */
async function fixtureUser(email: string, password: string) {
  const existing = (await membershipDatabase().query<{ id: string }>('SELECT id FROM member_user WHERE email=$1', [email])).rows[0];
  if (existing) return existing.id;
  const context = await memberAuth().$context;
  const user = await context.internalAdapter.createUser({ email, name: 'Fixture Member', emailVerified: true }, { method: 'admin' });
  await context.internalAdapter.linkAccount({ userId: user.id, providerId: 'credential', accountId: user.id, password: await context.password.hash(password) });
  return user.id;
}

async function applyState(userId: string, state: State) {
  await transaction(async client => {
    // Reset only this account's membership data; its sessions stay valid between states.
    await client.query('DELETE FROM member_conversation_bookings WHERE user_id=$1', [userId]);
    await client.query("DELETE FROM member_service_requests WHERE user_id=$1", [userId]);
    await client.query('DELETE FROM membership_invoices WHERE membership_id IN (SELECT id FROM memberships WHERE user_id=$1)', [userId]);
    await client.query('DELETE FROM memberships WHERE user_id=$1', [userId]);
    await client.query('DELETE FROM membership_attempts WHERE user_id=$1', [userId]);
    if (state === 'none') return;
    const tier: TierId = ['witness', 'companion'].includes(state) ? state as TierId : 'champion';
    const attemptId = randomUUID(), now = Date.now();
    if (state === 'pending') {
      await client.query(`INSERT INTO membership_attempts(id,user_id,tier,price_id,monthly_cents,terms_version,status,expires_at) VALUES ($1,$2,$3,'fixture_price',$4,'membership-draft-v1','open',NOW()+INTERVAL '30 minutes')`, [attemptId, userId, tier, priceFor(tier)]);
      return;
    }
    await client.query(`INSERT INTO membership_attempts(id,user_id,tier,price_id,monthly_cents,terms_version,status,expires_at) VALUES ($1,$2,$3,'fixture_price',$4,'membership-draft-v1','completed',NOW())`, [attemptId, userId, tier, priceFor(tier)]);
    const start = new Date(now - (state === 'expired' ? 120 : state === 'past-due' ? 40 : 10) * DAY);
    const end = addMonths(start, 3), firstPaid = addMonths(start, 1);
    const status = { 'past-due': 'past_due', canceled: 'canceled', expired: 'canceled' }[state as string] ?? 'active';
    const paidThrough = state === 'expired' ? end : firstPaid;
    const nextPayment = ['canceled', 'expired'].includes(state) ? null : state === 'past-due' ? addMonths(start, 2) : firstPaid;
    const membershipId = randomUUID(), fixtureId = 'fixture_' + membershipId.replace(/-/g, '');
    await client.query(`INSERT INTO memberships(id,attempt_id,user_id,tier,stripe_customer_id,stripe_subscription_id,stripe_schedule_id,status,term_start,term_end,paid_through,next_payment_at,revoked_at)
      VALUES ($1,$2,$3,$4,'fixture_customer',$5,$6,$7,$8,$9,$10,$11,$12)`, [membershipId, attemptId, userId, tier, fixtureId + '_sub', fixtureId + '_sched', status, start, end, paidThrough, nextPayment, state === 'revoked' ? new Date(now) : null]);
    const months = state === 'expired' ? 3 : 1;
    for (let month = 0; month < months; month++) {
      await client.query(`INSERT INTO membership_invoices(stripe_invoice_id,membership_id,status,currency,amount_due,amount_paid,period_start,period_end,hosted_url) VALUES ($1,$2,'paid','usd',$3,$3,$4,$5,NULL)`,
        [`${fixtureId}_in${month}`, membershipId, priceFor(tier), addMonths(start, month), addMonths(start, month + 1)]);
    }
    if (state === 'past-due') await client.query(`INSERT INTO membership_invoices(stripe_invoice_id,membership_id,status,currency,amount_due,amount_paid,period_start,period_end,hosted_url) VALUES ($1,$2,'open','usd',$3,0,$4,$5,NULL)`,
      [`${fixtureId}_open`, membershipId, priceFor(tier), firstPaid, addMonths(start, 2)]);
  });
}

async function main() {
  const state = process.argv.slice(2).find(arg => !arg.startsWith('--')) as State | undefined;
  if (!state || !FIXTURE_STATES.includes(state)) throw new Error(`Choose a state: ${FIXTURE_STATES.join(', ')}`);
  const { email, password } = guard();
  await applyState(await fixtureUser(email, password), state);
  console.log(`Fixture account is now: ${state}`);
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Fixture failed'); process.exitCode = 1; }).finally(() => membershipDatabase().end());
