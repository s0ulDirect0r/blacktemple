import './helpers/placeholder-db-env';
import test, { mock, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import type Stripe from 'stripe';
import { POST as checkout } from '@/app/api/support/checkout/route';
import { POST as webhook } from '@/app/api/calls/webhook/route';
import { supportCents } from '@/lib/support/amount';
import { checkoutSupport } from '@/lib/support/checkout';
import { SUPPORT_LIVE_ACCOUNT_ID, supportConfiguration, supportSiteOrigin, supportStripe, verifySupportStripe } from '@/lib/support/config';
import { SUPPORT_APP, handleSupportEvent, paidSupport, recordSupport, resolveSupport, supportCheckoutParams } from '@/lib/support/payments';
import { dispatchCheckoutEvent } from '@/lib/support/webhook';
import { stripe } from '@/lib/calls/stripe';

function session(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  return { id: 'cs_test_support1', object: 'checkout.session', mode: 'payment', status: 'complete', payment_status: 'paid',
    amount_total: 1234, currency: 'usd', livemode: false, subscription: null, payment_intent: 'pi_support1',
    metadata: { app: SUPPORT_APP, amountCents: '1234' }, ...overrides } as Stripe.Checkout.Session;
}
function event(type = 'checkout.session.completed', value = session()): Stripe.Event {
  return { id: 'evt_support1', object: 'event', type, livemode: value.livemode, data: { object: value } } as Stripe.Event;
}
function testConfig(t: TestContext) {
  const names = ['VERCEL_ENV', 'STRIPE_SECRET_KEY', 'SUPPORT_STRIPE_ACCOUNT_ID', 'SUPPORT_SITE_ORIGIN', 'SUPPORT_CHECKOUT_ENABLED'] as const;
  const before = names.map(name => process.env[name]);
  t.after(() => names.forEach((name, index) => {
    if (before[index] === undefined) delete process.env[name]; else process.env[name] = before[index];
  }));
  process.env.VERCEL_ENV = 'preview';
  process.env.STRIPE_SECRET_KEY = 'sk_test_fixture_not_a_credential';
  process.env.SUPPORT_STRIPE_ACCOUNT_ID = 'acct_fixture';
  process.env.SUPPORT_SITE_ORIGIN = 'http://localhost:3003';
  process.env.SUPPORT_CHECKOUT_ENABLED = 'true';
}

test('custom USD amounts use exact cents and reject malformed or out-of-bounds values', () => {
  for (const [input, expected] of [['1', 100], ['12.34', 1234], ['1.1', 110], ['1000.00', 100000], [' 5.00 ', 500]] as const) assert.equal(supportCents(input), expected);
  for (const value of [null, {}, [], 10, '', '0', '0.99', '-1', '1000.01', '10000', '1.234', '1e2', 'NaN', 'Infinity', '1,000', '$10', '+1', '1.', '.99', '0x10']) assert.equal(supportCents(value), null, String(value));
});

test('Stripe configuration requires test outside production and the pinned live account in production', t => {
  testConfig(t);
  assert.deepEqual(supportConfiguration(), { live: false, accountId: 'acct_fixture' });
  for (const key of ['', 'pk_test_fixture', 'sk_live_fixture']) {
    process.env.STRIPE_SECRET_KEY = key;
    assert.throws(() => supportStripe());
  }
  process.env.VERCEL_ENV = 'production';
  process.env.STRIPE_SECRET_KEY = 'rk_live_fixture';
  assert.throws(() => supportConfiguration());
  process.env.SUPPORT_STRIPE_ACCOUNT_ID = SUPPORT_LIVE_ACCOUNT_ID;
  assert.deepEqual(supportConfiguration(), { live: true, accountId: SUPPORT_LIVE_ACCOUNT_ID });
  process.env.STRIPE_SECRET_KEY = 'sk_test_fixture';
  assert.throws(() => supportConfiguration());
});

test('canonical support origin rejects paths, credentials, insecure production and missing configuration', () => {
  assert.equal(supportSiteOrigin({ SUPPORT_SITE_ORIGIN: 'http://localhost:3003' }), 'http://localhost:3003');
  assert.equal(supportSiteOrigin({ VERCEL_ENV: 'production', SUPPORT_SITE_ORIGIN: 'https://www.blacktemple.dev' }), 'https://www.blacktemple.dev');
  for (const origin of [undefined, '', 'https://www.blacktemple.dev/', 'https://www.blacktemple.dev/path', 'https://www.blacktemple.dev?x=1', 'https://user:pass@example.com', 'file:///tmp', 'http://www.blacktemple.dev']) {
    assert.throws(() => supportSiteOrigin({ VERCEL_ENV: 'production', SUPPORT_SITE_ORIGIN: origin }));
  }
});

test('checkout verifies actual authenticated account, charge capability and balance mode', async t => {
  testConfig(t);
  function client(accountId = 'acct_fixture', live = false, charges = true) {
    return { accounts: { retrieve: async () => ({ id: accountId, charges_enabled: charges }) }, balance: { retrieve: async () => ({ livemode: live }) } } as unknown as Pick<Stripe, 'accounts' | 'balance'>;
  }
  await verifySupportStripe(client());
  await assert.rejects(verifySupportStripe(client('acct_other')));
  await assert.rejects(verifySupportStripe(client('acct_fixture', true)));
  await assert.rejects(verifySupportStripe(client('acct_fixture', false, false)));
});

test('Checkout is one card payment without recurring billing, account binding or future card usage', () => {
  const params = supportCheckoutParams(1234, 'https://www.blacktemple.dev');
  assert.equal(params.mode, 'payment');
  assert.deepEqual(params.payment_method_types, ['card']);
  assert.equal(params.success_url, 'https://www.blacktemple.dev/support/thanks?session_id={CHECKOUT_SESSION_ID}');
  assert.equal(params.cancel_url, 'https://www.blacktemple.dev/support?checkout=cancelled');
  assert.deepEqual(params.metadata, { app: SUPPORT_APP, amountCents: '1234' });
  assert.deepEqual(params.line_items?.[0].price_data, { currency: 'usd', unit_amount: 1234, product_data: {
    name: 'One-time support for Black Temple', description: 'Optional support for Anansi’s work. No membership, services or rewards.',
  } });
  for (const property of ['subscription_data', 'setup_intent_data', 'customer', 'customer_creation', 'client_reference_id', 'discounts', 'allow_promotion_codes']) assert.equal(property in params, false);
  assert.equal(params.payment_intent_data?.setup_future_usage, undefined);
  for (const value of [NaN, 0, 99, 100001, 1.1]) assert.throws(() => supportCheckoutParams(value, 'https://www.blacktemple.dev'));
});

test('canonical payment validation rejects unpaid, foreign, mismatched, recurring and wrong-mode sessions', async t => {
  testConfig(t);
  assert.equal(paidSupport(session()), true);
  for (const overrides of [
    { payment_status: 'unpaid' }, { payment_status: 'no_payment_required' }, { status: 'open' }, { mode: 'setup' }, { mode: 'subscription' },
    { currency: 'eur' }, { subscription: 'sub_1' }, { livemode: true }, { amount_total: 0 }, { amount_total: 100001 },
    { amount_total: 1234.5 }, { amount_total: null }, { payment_intent: null }, { metadata: null },
    { metadata: { app: 'blacktemple_membership', amountCents: '1234' } }, { metadata: { app: SUPPORT_APP, amountCents: '1235' } },
  ] as Partial<Stripe.Checkout.Session>[]) {
    assert.equal(paidSupport(session(overrides)), false, JSON.stringify(overrides));
    assert.equal(await recordSupport(session(overrides)), false);
  }
  process.env.VERCEL_ENV = 'production';
  assert.equal(paidSupport(session()), false);
  assert.equal(paidSupport(session({ livemode: true })), true);
});

test('support ledger retains database-enforced session/intent deduplication and minimal bookkeeping fields', async () => {
  const migration = await readFile('migrations/007_support.sql', 'utf8');
  assert.match(migration, /checkout_session_id TEXT PRIMARY KEY/);
  assert.match(migration, /payment_intent_id TEXT NOT NULL UNIQUE/);
  assert.match(migration, /CHECK \(amount_cents BETWEEN 100 AND 100000\)/);
  assert.match(migration, /CHECK \(currency = 'usd'\)/);
  assert.doesNotMatch(migration, /membership|customer|email|name|subscription/i);
  const recorder = await readFile('src/lib/support/payments.ts', 'utf8');
  assert.match(recorder, /ON CONFLICT \(checkout_session_id\) DO NOTHING/);
  assert.doesNotMatch(recorder, /INSERT INTO (memberships|membership_attempts|call_bookings)/);
});

test('confirmation distinguishes lookup failures and bookkeeping retries without suggesting another payment', async t => {
  testConfig(t);
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

test('support webhook fetches canonical state, rejects wrong mode and propagates ledger failures for retry', async t => {
  testConfig(t);
  const retrieve = mock.fn(async () => session());
  const record = mock.fn(async () => true);
  assert.equal(await handleSupportEvent(event(), { retrieve, record }), true);
  assert.equal(await handleSupportEvent(event('checkout.session.async_payment_succeeded'), { retrieve, record }), true);
  assert.equal(record.mock.callCount(), 2);
  assert.equal(await handleSupportEvent(event('checkout.session.expired'), { retrieve, record }), true);
  assert.equal(await handleSupportEvent(event('checkout.session.async_payment_failed'), { retrieve, record }), true);
  assert.equal(retrieve.mock.callCount(), 2);
  assert.equal(await handleSupportEvent(event('checkout.session.completed', session({ metadata: { app: 'other' } })), { retrieve, record }), false);
  assert.equal(await handleSupportEvent(event(), { retrieve: async () => session({ payment_status: 'unpaid' }), record }), true);
  assert.equal(record.mock.callCount(), 2);
  await assert.rejects(handleSupportEvent(event('checkout.session.completed', session({ livemode: true })), { retrieve, record }));
  await assert.rejects(handleSupportEvent(event(), { retrieve, record: async () => false }));
  await assert.rejects(handleSupportEvent(event(), { retrieve, record: async () => { throw Error('database'); } }));
  await assert.rejects(handleSupportEvent(event(), { retrieve: async () => { throw Error('Stripe unavailable'); }, record }));
});

test('support-first webhook dispatch awaits recording and never reaches calls/calendar operations', async () => {
  const order: string[] = [];
  const retrieve = mock.fn(async () => session());
  const confirm = mock.fn(async () => null);
  const release = mock.fn(async () => undefined);
  const support = async () => { await Promise.resolve(); order.push('recorded'); return true; };
  await dispatchCheckoutEvent(event(), { support, retrieve, confirm, release });
  order.push('acknowledged');
  assert.deepEqual(order, ['recorded', 'acknowledged']);
  for (const fn of [retrieve, confirm, release]) assert.equal(fn.mock.callCount(), 0);
  await assert.rejects(dispatchCheckoutEvent(event(), { support: async () => { throw Error('ledger offline'); }, retrieve, confirm, release }));
  assert.equal(confirm.mock.callCount(), 0);
  await dispatchCheckoutEvent(event(), { support: async () => false, retrieve, confirm, release });
  assert.equal(confirm.mock.callCount(), 1);
  await dispatchCheckoutEvent(event('checkout.session.expired'), { support: async () => false, retrieve, confirm, release });
  assert.equal(release.mock.callCount(), 1);
});

test('checkout HTTP validates origin, JSON, exact amount and streamed size before Stripe; retries reuse session key', async t => {
  testConfig(t);
  const ready = mock.fn(async () => undefined);
  const verify = mock.fn(async () => undefined);
  const create = mock.fn(async () => ({ status: 'open' as const, url: 'https://checkout.stripe.com/test' }));
  const deps = { ready, verify, create };
  const body = JSON.stringify({ amount: '12.34', requestId: '01234567-89ab-4def-8123-456789abcdef', tier: 'ignored', userId: 'ignored' });
  function request(text = body, origin = 'http://localhost:3003', contentType = 'application/json', url = 'http://localhost:3003/api/support/checkout') {
    return new Request(url, { method: 'POST', headers: { origin, 'content-type': contentType }, body: text });
  }
  assert.equal((await checkoutSupport(request(body, 'https://elsewhere.example'), deps)).status, 403);
  assert.equal((await checkoutSupport(request(body, 'http://localhost:3003', 'text/plain'), deps)).status, 415);
  assert.equal((await checkoutSupport(request(body, 'http://localhost:3003', 'text/application/json'), deps)).status, 415);
  for (const text of ['null', '[]', '{', '{"amount":"0.10"}', '{"amount":"5","requestId":"bad"}']) assert.equal((await checkoutSupport(request(text), deps)).status, 400);
  assert.equal((await checkoutSupport(request(' '.repeat(1025)), deps)).status, 413);
  assert.equal(create.mock.callCount(), 0);
  const response = await checkoutSupport(request(), deps);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { url: 'https://checkout.stripe.com/test' });
  assert.equal((await checkoutSupport(request(body, 'http://localhost:3003', 'application/json', 'https://attacker.example/api/support/checkout'), deps)).status, 200);
  assert.deepEqual(create.mock.calls[0].arguments, create.mock.calls[1].arguments);
  const args = create.mock.calls[0].arguments as unknown as [Stripe.Checkout.SessionCreateParams, Stripe.RequestOptions];
  assert.equal(args[0].success_url, 'http://localhost:3003/support/thanks?session_id={CHECKOUT_SESSION_ID}');
  assert.deepEqual(args[1], { idempotencyKey: 'bt-support:01234567-89ab-4def-8123-456789abcdef' });
  assert.equal(ready.mock.callCount(), 2);
  assert.equal(verify.mock.callCount(), 2);
  assert.equal((await checkoutSupport(request(), { ...deps, verify: async () => { throw Error('Wrong account'); } })).status, 503);
  assert.equal((await checkoutSupport(request(), { ...deps, ready: async () => { throw Error('Missing schema'); } })).status, 503);
  assert.equal(create.mock.callCount(), 2);
  assert.equal((await checkoutSupport(request(), { ...deps, create: async () => ({ status: 'complete', url: null }) })).status, 409);
  process.env.SUPPORT_CHECKOUT_ENABLED = 'false';
  assert.equal((await checkout(request())).status, 503);
});

test('signed support webhook returns 200 only after canonical handling and 500 when paid validation needs retry', async t => {
  testConfig(t);
  const before = process.env.STRIPE_WEBHOOK_SECRET;
  const secret = 'whsec_fixture_not_a_credential';
  process.env.STRIPE_WEBHOOK_SECRET = secret;
  t.after(() => { if (before === undefined) delete process.env.STRIPE_WEBHOOK_SECRET; else process.env.STRIPE_WEBHOOK_SECRET = before; });
  const retrieve = mock.method(stripe().checkout.sessions, 'retrieve', async () => session({ payment_status: 'unpaid' }));
  t.after(() => retrieve.mock.restore());
  const body = JSON.stringify(event('checkout.session.completed', session({ client_reference_id: 'must_not_reach_calls' })));
  function delivery() {
    return new Request('http://localhost/api/calls/webhook', { method: 'POST', body,
      headers: { 'stripe-signature': stripe().webhooks.generateTestHeaderString({ payload: body, secret }) } });
  }
  assert.equal((await webhook(delivery())).status, 200);
  assert.equal(retrieve.mock.callCount(), 1, 'support is retrieved once and never falls through to calls');
  retrieve.mock.mockImplementation(async () => session({ metadata: { app: SUPPORT_APP, amountCents: '1235' } }));
  const failed = await webhook(delivery());
  assert.equal(failed.status, 500);
  assert.deepEqual(await failed.json(), { error: 'Handler failed.' });
  assert.equal(retrieve.mock.callCount(), 2);
  retrieve.mock.mockImplementation(async () => { throw Error('Stripe temporarily unavailable'); });
  assert.equal((await webhook(delivery())).status, 500);
});

test('existing webhook rejects missing and forged signatures before payment work', async t => {
  testConfig(t);
  const before = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fixture_not_a_credential';
  t.after(() => { if (before === undefined) delete process.env.STRIPE_WEBHOOK_SECRET; else process.env.STRIPE_WEBHOOK_SECRET = before; });
  assert.equal((await webhook(new Request('http://localhost/api/calls/webhook', { method: 'POST', body: '{}' }))).status, 400);
  assert.equal((await webhook(new Request('http://localhost/api/calls/webhook', { method: 'POST', body: '{}', headers: { 'stripe-signature': 'forged' } }))).status, 400);
});
