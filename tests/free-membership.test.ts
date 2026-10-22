import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { paidMembershipVisible, safeGameReturn } from '../src/lib/membership/config';
import { loginCallback } from '../src/lib/membership/auth-route';
import { validStripeSignature } from '../src/lib/escalation/store';

test('paid membership stays hidden unless explicitly enabled', () => {
  assert.equal(paidMembershipVisible({}), false);
  assert.equal(paidMembershipVisible({ MEMBERSHIP_PAID_VISIBLE: 'false' }), false);
  assert.equal(paidMembershipVisible({ MEMBERSHIP_PAID_VISIBLE: '1' }), false);
  assert.equal(paidMembershipVisible({ MEMBERSHIP_PAID_VISIBLE: 'true' }), true);
});

test('sign-in only returns to the ESCALATION front page', () => {
  assert.equal(safeGameReturn('https://escalation.blacktemple.dev/'), 'https://escalation.blacktemple.dev/');
  assert.equal(safeGameReturn('https://escalation.blacktemple.dev/?slot=2'), 'https://escalation.blacktemple.dev/?slot=2');
  assert.equal(safeGameReturn('https://escalation.blacktemple.dev'), 'https://escalation.blacktemple.dev/');
  for (const bad of [
    'https://escalation.blacktemple.dev/admin', 'https://evil.example/', 'http://escalation.blacktemple.dev/',
    'https://escalation.blacktemple.dev.evil.example/', 'https://user:pass@escalation.blacktemple.dev/',
    'https://escalation.blacktemple.dev/#x', '/members', 'javascript:alert(1)', 42, undefined,
  ]) assert.equal(safeGameReturn(bad), null, String(bad));
});

test('verification keeps a valid game return and drops anything else', () => {
  const origin = 'https://www.blacktemple.dev';
  assert.equal(loginCallback(undefined, origin), '/login?verified=1');
  assert.equal(loginCallback('/login?return=' + encodeURIComponent('https://escalation.blacktemple.dev/?a=1'), origin),
    '/login?verified=1&return=' + encodeURIComponent('https://escalation.blacktemple.dev/?a=1'));
  assert.equal(loginCallback('/login?return=' + encodeURIComponent('https://evil.example/'), origin), '/login?verified=1');
});

test('Stripe signatures are checked against the raw body, secret and time', () => {
  const secret = 'whsec_test', body = '{"id":"evt_1"}', now = Date.UTC(2026, 9, 22);
  const t = Math.floor(now / 1000);
  const sign = (payload: string, key = secret) => createHmac('sha256', key).update(`${t}.${payload}`).digest('hex');
  assert.equal(validStripeSignature(body, `t=${t},v1=${sign(body)}`, secret, now), true);
  assert.equal(validStripeSignature(body, `t=${t},v1=${'0'.repeat(64)},v1=${sign(body)}`, secret, now), true);
  assert.equal(validStripeSignature(body + ' ', `t=${t},v1=${sign(body)}`, secret, now), false);
  assert.equal(validStripeSignature(body, `t=${t},v1=${sign(body, 'whsec_other')}`, secret, now), false);
  assert.equal(validStripeSignature(body, `t=${t},v1=${sign(body)}`, secret, now + 301_000), false);
  assert.equal(validStripeSignature(body, null, secret, now), false);
  assert.equal(validStripeSignature(body, `t=${t},v1=zz`, secret, now), false);
});
