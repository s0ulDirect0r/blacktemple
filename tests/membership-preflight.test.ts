import assert from 'node:assert/strict';
import test from 'node:test';
import { membershipPreflight } from '../src/lib/membership/preflight';

const local = {
  BETTER_AUTH_URL: 'http://localhost:3002', MEMBERSHIP_DATABASE_URL: 'postgresql://localhost/test',
  BETTER_AUTH_SECRET: 'a'.repeat(32), MEMBERSHIP_JOB_SECRET: 'b'.repeat(32),
  MEMBERSHIP_STRIPE_SECRET_KEY: 'sk_test_fixture', MEMBERSHIP_STRIPE_WEBHOOK_SECRET: 'whsec_fixture',
  MEMBERSHIP_BILLING_MODE: 'test', MEMBERSHIP_CHECKOUT_ENABLED: 'false',
  MEMBERSHIP_PRICE_WITNESS: 'price_w', MEMBERSHIP_PRICE_COMPANION: 'price_c', MEMBERSHIP_PRICE_CHAMPION: 'price_h',
  MEMBERSHIP_EMAIL_MODE: 'capture', MEMBERSHIP_EMAIL_CAPTURE_DIR: '/tmp/membership-fixture',
};
test('local preflight is static, secret-free and explicitly reports limits', () => {
  const result = membershipPreflight(local, 'local');
  assert.equal(result.ok, true);
  assert.ok(result.warnings.some(value => value.includes('not live billing readiness')));
  for (const name of ['BETTER_AUTH_SECRET', 'MEMBERSHIP_JOB_SECRET', 'MEMBERSHIP_STRIPE_SECRET_KEY', 'MEMBERSHIP_STRIPE_WEBHOOK_SECRET']) assert.ok(!JSON.stringify(result).includes(local[name as keyof typeof local]));
});
test('preflight rejects remote local targets, malformed origins, weak secrets and mismatched Stripe mode', () => {
  for (const patch of [
    { MEMBERSHIP_DATABASE_URL: 'postgresql://db.example/test' }, { BETTER_AUTH_URL: 'http://localhost:3002/path' },
    { BETTER_AUTH_URL: 'https://user:pass@example.test' }, { BETTER_AUTH_SECRET: 'short' },
    { MEMBERSHIP_STRIPE_SECRET_KEY: 'sk_live_fixture' }, { MEMBERSHIP_PRICE_CHAMPION: 'price_w' },
    { MEMBERSHIP_CAPACITY_CHAMPION: '0' }, { MEMBERSHIP_BILLING_MODE: 'live' },
  ]) assert.equal(membershipPreflight({ ...local, ...patch }, 'local').ok, false, JSON.stringify(Object.keys(patch)));
});
const production = { ...local, BETTER_AUTH_URL: 'https://members.example.test',
  MEMBERSHIP_DATABASE_URL: 'postgresql://db.example/test?sslmode=verify-full',
  MEMBERSHIP_EMAIL_MODE: 'resend', MEMBERSHIP_EMAIL_RESEND_API_KEY: 'fixture',
  MEMBERSHIP_EMAIL_FROM: 'Members <members@example.test>', MEMBERSHIP_EMAIL_SEND_ENABLED: 'true',
};
test('production preflight requires TLS, HTTPS, real email delivery and all live gates', () => {
  assert.equal(membershipPreflight(production, 'production').ok, true);
  for (const patch of [
    { MEMBERSHIP_DATABASE_URL: 'postgresql://db.example/test' }, { BETTER_AUTH_URL: 'http://members.example.test' },
    { MEMBERSHIP_EMAIL_MODE: 'capture' }, { MEMBERSHIP_EMAIL_SEND_ENABLED: 'false' },
    { MEMBERSHIP_BILLING_MODE: 'live', MEMBERSHIP_STRIPE_SECRET_KEY: 'sk_live_fixture' },
  ]) assert.equal(membershipPreflight({ ...production, ...patch }, 'production').ok, false);
  const live = { ...production, MEMBERSHIP_BILLING_MODE: 'live', MEMBERSHIP_STRIPE_SECRET_KEY: 'sk_live_fixture', MEMBERSHIP_LIVE_ENABLED: 'true', VERCEL_ENV: 'production' };
  assert.equal(membershipPreflight(live, 'production').ok, true);
  assert.equal(membershipPreflight(live, 'preview').ok, false);
});
test('hosted preview requires explicitly enabled provider delivery while keeping Stripe in sandbox', () => {
  const preview = {...production,MEMBERSHIP_STAGING_MODE:'true',MEMBERSHIP_EMAIL_ALLOWED_RECIPIENT:'fixture@example.test'};
  assert.equal(membershipPreflight(preview, 'preview').ok, true);
  assert.equal(membershipPreflight(production, 'preview').ok, false);
  for (const patch of [
    { MEMBERSHIP_EMAIL_MODE: 'capture' }, { MEMBERSHIP_EMAIL_SEND_ENABLED: 'false' },
    { MEMBERSHIP_EMAIL_RESEND_API_KEY: '' }, { MEMBERSHIP_EMAIL_FROM: 'invalid' },
    { MEMBERSHIP_EMAIL_FROM: 'Members <members@example.test>\nBcc: victim@example.test' },
    { MEMBERSHIP_EMAIL_REPLY_TO: 'a@example.test,b@example.test' },
    { MEMBERSHIP_LIVE_ENABLED: 'true' },
  ]) assert.equal(membershipPreflight({ ...preview, ...patch }, 'preview').ok, false);
});
test('capture preflight rejects production and public/build output paths', () => {
  for (const patch of [
    { VERCEL_ENV: 'production' }, { MEMBERSHIP_EMAIL_CAPTURE_DIR: 'relative' },
    { MEMBERSHIP_EMAIL_CAPTURE_DIR: '/tmp/public/mail' }, { MEMBERSHIP_EMAIL_CAPTURE_DIR: '/tmp/.next/mail' },
    { MEMBERSHIP_EMAIL_CAPTURE_DIR: '/tmp/out/mail' },
  ]) assert.equal(membershipPreflight({ ...local, ...patch }, 'local').ok, false);
});
