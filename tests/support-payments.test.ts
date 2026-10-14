import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Stripe from 'stripe';
import { PGlite } from '@electric-sql/pglite';
import { membershipDatabase } from '@/lib/membership/database';
import { membershipStripe } from '@/lib/membership/stripe';
import { handleMembershipEvent } from '@/lib/membership/billing';
import { enqueueMembershipEvent, processNextMembershipEvent } from '@/lib/membership/jobs';
import { POST as checkout } from '@/app/api/support/checkout/route';
import { POST as webhook } from '@/app/api/membership/webhook/route';
import { supportCents } from '@/lib/support/amount';
import { SUPPORT_APP, handleSupportEvent, paidSupport, recordSupport, resolveSupport, supportCheckoutParams } from '@/lib/support/payments';

function session(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  return { id: 'cs_test_support1', object: 'checkout.session', mode: 'payment', status: 'complete', payment_status: 'paid',
    amount_total: 1234, currency: 'usd', livemode: false, subscription: null, payment_intent: 'pi_support1',
    metadata: { app: SUPPORT_APP, amountCents: '1234' }, ...overrides } as Stripe.Checkout.Session;
}
function event(type: string, value = session()): Stripe.Event {
  return { id: 'evt_support1', object: 'event', type, livemode: false, data: { object: value } } as Stripe.Event;
}

test('custom USD amount uses exact cents and rejects malformed or out-of-bounds values', () => {
  for (const [input, expected] of [['1', 100], ['12.34', 1234], ['1.1', 110], ['1000.00', 100000], [' 5.00 ', 500]] as const) assert.equal(supportCents(input), expected);
  for (const value of [null, {}, [], 10, '', '0', '0.99', '-1', '1000.01', '10000', '1.234', '1e2', 'NaN', 'Infinity', '1,000', '$10', '+1', '1.', '.99', '0x10']) assert.equal(supportCents(value), null, String(value));
});

test('checkout is explicitly one payment without recurring prices, account binding or future usage', () => {
  const params = supportCheckoutParams(1234, 'https://blacktemple.dev');
  assert.equal(params.mode, 'payment');
  assert.deepEqual(params.payment_method_types, ['card']);
  assert.equal(params.success_url, 'https://blacktemple.dev/support/thanks?session_id={CHECKOUT_SESSION_ID}');
  assert.equal(params.cancel_url, 'https://blacktemple.dev/support?checkout=cancelled');
  assert.deepEqual(params.metadata, { app: SUPPORT_APP, amountCents: '1234' });
  assert.deepEqual(params.line_items?.[0].price_data, { currency: 'usd', unit_amount: 1234, product_data: {
    name: 'One-time support for Black Temple', description: 'Optional support for Anansi’s work. No membership, services or rewards.',
  } });
  for (const property of ['subscription_data', 'setup_intent_data', 'customer', 'customer_creation', 'client_reference_id', 'discounts', 'allow_promotion_codes']) assert.equal(property in params, false);
  assert.equal(params.payment_intent_data?.setup_future_usage, undefined);
  for (const value of [NaN, 0, 99, 100001, 1.1]) assert.throws(() => supportCheckoutParams(value, 'https://blacktemple.dev'));
});

test('confirmation rejects unpaid, foreign, mismatched, recurring and wrong-mode sessions', () => {
  assert.equal(paidSupport(session()), true);
  for (const overrides of [
    { payment_status: 'unpaid' }, { payment_status: 'no_payment_required' }, { status: 'open' }, { mode: 'setup' }, { mode: 'subscription' },
    { currency: 'eur' }, { subscription: 'sub_1' }, { livemode: true }, { amount_total: 0 }, { amount_total: 100001 },
    { amount_total: 1234.5 }, { amount_total: null }, { payment_intent: null }, { metadata: null },
    { metadata: { app: 'blacktemple_membership', amountCents: '1234' } }, { metadata: { app: SUPPORT_APP, amountCents: '1235' } },
  ] as Partial<Stripe.Checkout.Session>[]) assert.equal(paidSupport(session(overrides)), false, JSON.stringify(overrides));
});

test('confirmation distinguishes lookup failures and paid bookkeeping retries without suggesting another payment', async () => {
  const retrieve = mock.fn(async () => session());
  const record = mock.fn(async () => true);
  assert.deepEqual(await resolveSupport(undefined, { retrieve, record }), { kind: 'unconfirmed' });
  assert.deepEqual(await resolveSupport(['cs_test_support1'], { retrieve, record }), { kind: 'unconfirmed' });
  assert.equal(retrieve.mock.callCount(), 0);
  assert.deepEqual(await resolveSupport('cs_test_support1', { retrieve, record }), { kind: 'paid', amountCents: 1234 });
  assert.deepEqual(await resolveSupport('cs_test_support1', { retrieve: async () => { throw Error('offline'); }, record }), { kind: 'unavailable' });
  assert.deepEqual(await resolveSupport('cs_test_support1', { retrieve, record: async () => { throw Error('database'); } }), { kind: 'paid-pending' });
  record.mock.resetCalls();
  assert.deepEqual(await resolveSupport('cs_test_support1', { retrieve: async () => session({ payment_status: 'unpaid' }), record }), { kind: 'unconfirmed' });
  assert.equal(record.mock.callCount(), 0);
});

test('webhook fetches canonical state and propagates failures for the existing durable retry queue', async () => {
  const retrieve = mock.fn(async () => session());
  const record = mock.fn(async () => true);
  assert.equal(await handleSupportEvent(event('checkout.session.completed'), { retrieve, record }), true);
  assert.equal(await handleSupportEvent(event('checkout.session.async_payment_succeeded'), { retrieve, record }), true);
  assert.equal(record.mock.callCount(), 2);
  assert.equal(await handleSupportEvent(event('checkout.session.expired'), { retrieve, record }), true);
  assert.equal(await handleSupportEvent(event('checkout.session.async_payment_failed'), { retrieve, record }), true);
  assert.equal(retrieve.mock.callCount(), 2);
  assert.equal(await handleSupportEvent(event('checkout.session.completed', session({ metadata: { app: 'blacktemple_membership' } })), { retrieve, record }), false);
  assert.equal(await handleSupportEvent(event('checkout.session.completed'), { retrieve: async () => session({ payment_status: 'unpaid' }), record }), true);
  assert.equal(record.mock.callCount(), 2);
  await assert.rejects(handleSupportEvent(event('checkout.session.completed'), { retrieve, record: async () => false }));
  await assert.rejects(handleSupportEvent(event('checkout.session.completed'), { retrieve, record: async () => { throw Error('database'); } }));
});

test('real PostgreSQL ledger deduplicates concurrent webhook/page confirmation and never grants membership', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(await readFile('migrations/membership/009_support.sql', 'utf8'));
  await db.exec(await readFile('migrations/membership/003_webhook_queue.sql', 'utf8'));
  await db.exec('CREATE TABLE memberships (id TEXT); CREATE TABLE membership_attempts (id TEXT);');
  const old = process.env.MEMBERSHIP_DATABASE_URL;
  process.env.MEMBERSHIP_DATABASE_URL = 'postgresql://fixture@localhost/fixture';
  t.after(() => { if (old === undefined) delete process.env.MEMBERSHIP_DATABASE_URL; else process.env.MEMBERSHIP_DATABASE_URL = old; });
  const query = mock.method(membershipDatabase(), 'query', async (sql: string, params: unknown[]) => {
    const result = await db.query(sql, params);
    return { rows: result.rows, rowCount: result.affectedRows ?? result.rows.length };
  });
  t.after(() => query.mock.restore());
  process.env.MEMBERSHIP_BILLING_MODE = 'test';
  process.env.MEMBERSHIP_STRIPE_SECRET_KEY = 'sk_test_fixture_not_a_credential';
  const retrieve = mock.method(membershipStripe().checkout.sessions, 'retrieve', async () => session());
  t.after(() => retrieve.mock.restore());
  await Promise.all([handleMembershipEvent(event('checkout.session.completed')), recordSupport(session()), handleMembershipEvent(event('checkout.session.async_payment_succeeded'))]);
  await handleMembershipEvent(event('checkout.session.completed'));
  const records = await db.query<{ amount_cents: number }>('SELECT * FROM support_payments');
  assert.equal(records.rows.length, 1);
  assert.equal(records.rows[0].amount_cents, 1234);
  assert.equal((await db.query('SELECT * FROM memberships')).rows.length, 0);
  assert.equal((await db.query('SELECT * FROM membership_attempts')).rows.length, 0);
  // The support path must never even open the membership transaction/lock.
  assert.ok(query.mock.calls.every(call => String(call.arguments[0]).startsWith('INSERT INTO support_payments')));
  await assert.rejects(recordSupport(session({ id: 'cs_test_support2' })), /unique constraint/);
  for (const value of [99, 100001]) await assert.rejects(db.query("INSERT INTO support_payments VALUES ($1,$2,$3,'usd',false,NOW())", ['cs_' + value, 'pi_' + value, value]), /check constraint/);

  // Exercise the existing durable queue with a real SQL lease, duplicate event,
  // failed provider lookup, then recovery. No membership schema is needed.
  const connect = mock.method(membershipDatabase(), 'connect', async () => ({ query: membershipDatabase().query.bind(membershipDatabase()), release() {} }));
  t.after(() => connect.mock.restore());
  const delivery = event('checkout.session.completed');
  assert.deepEqual(await enqueueMembershipEvent(delivery), { queued: true, duplicate: false });
  assert.deepEqual(await enqueueMembershipEvent(delivery), { queued: true, duplicate: true });
  retrieve.mock.mockImplementation(async () => { throw Error('Provider temporarily unavailable'); });
  assert.equal(await processNextMembershipEvent(), true);
  assert.equal((await db.query<{ status: string }>('SELECT status FROM membership_webhook_jobs')).rows[0].status, 'pending');
  await db.query('UPDATE membership_webhook_jobs SET available_at=NOW()');
  retrieve.mock.mockImplementation(async () => session());
  assert.equal(await processNextMembershipEvent(), true);
  const job = (await db.query<{ status: string; attempts: number }>('SELECT status,attempts FROM membership_webhook_jobs')).rows[0];
  assert.deepEqual(job, { status: 'complete', attempts: 2 });
  assert.equal((await db.query('SELECT * FROM support_payments')).rows.length, 1);
  assert.equal((await db.query('SELECT * FROM memberships')).rows.length, 0);
});

test('checkout HTTP validates origins, JSON, amount and streamed length before Stripe; retries reuse the same idempotency key', async t => {
  process.env.SUPPORT_CHECKOUT_ENABLED = 'true';
  process.env.BETTER_AUTH_URL = 'http://localhost:3003';
  process.env.MEMBERSHIP_STRIPE_SECRET_KEY = 'sk_test_fixture_not_a_credential';
  process.env.MEMBERSHIP_BILLING_MODE = 'test';
  process.env.MEMBERSHIP_DATABASE_URL = 'postgresql://fixture@localhost/fixture';
  const query = mock.method(membershipDatabase(), 'query', async () => ({ rows: [], rowCount: 0 }));
  const create = mock.method(membershipStripe().checkout.sessions, 'create', async () => ({ id: 'cs_test_open', status: 'open', url: 'https://checkout.stripe.com/test' }));
  t.after(() => { query.mock.restore(); create.mock.restore(); });
  const body = JSON.stringify({ amount: '12.34', requestId: '01234567-89ab-4def-8123-456789abcdef', tier: 'champion', userId: 'ignored' });
  function request(text = body, origin = 'http://localhost:3003', contentType = 'application/json') {
    return new Request('http://localhost:3003/api/support/checkout', { method: 'POST', headers: { origin, 'content-type': contentType }, body: text });
  }
  assert.equal((await checkout(request(body, 'https://elsewhere.example'))).status, 403);
  assert.equal((await checkout(request(body, 'http://localhost:3003', 'text/plain'))).status, 415);
  for (const text of ['null', '[]', '{', '{"amount":"0.10"}', '{"amount":"5","requestId":"bad"}']) assert.equal((await checkout(request(text))).status, 400);
  assert.equal((await checkout(request(' '.repeat(1025)))).status, 413);
  assert.equal(create.mock.callCount(), 0);
  const response = await checkout(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { url: 'https://checkout.stripe.com/test' });
  assert.equal((await checkout(request())).status, 200);
  assert.deepEqual(create.mock.calls[0].arguments, create.mock.calls[1].arguments);
  assert.equal((create.mock.calls[0].arguments as unknown[])[1] && JSON.stringify(create.mock.calls[0].arguments[1]), JSON.stringify({ idempotencyKey: 'bt-support:01234567-89ab-4def-8123-456789abcdef' }));
  assert.equal(query.mock.callCount(), 2);
  process.env.SUPPORT_CHECKOUT_ENABLED = 'false';
  assert.equal((await checkout(request())).status, 503);
});

test('existing webhook rejects missing and forged signatures before any queue work', async () => {
  process.env.MEMBERSHIP_STRIPE_WEBHOOK_SECRET = 'whsec_fixture_not_a_credential';
  assert.equal((await webhook(new Request('http://localhost/api/membership/webhook', { method: 'POST', body: '{}' }))).status, 400);
  assert.equal((await webhook(new Request('http://localhost/api/membership/webhook', { method: 'POST', body: '{}', headers: { 'stripe-signature': 'forged' } }))).status, 400);
});
