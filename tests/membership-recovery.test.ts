import assert from 'node:assert/strict';
import test from 'node:test';
import { recoveryAuthorization, recoveryOptions, runBoundedRecovery } from '../src/lib/membership/recovery';
import { GET } from '../src/app/api/membership/process/route';

test('recovery auth accepts only exact explicitly configured bearer secrets', () => {
  assert.equal(recoveryAuthorization(null, {}), 'unconfigured');
  const env = { MEMBERSHIP_JOB_SECRET: 'job-fixture', CRON_SECRET: 'cron-fixture' };
  for (const value of ['Bearer job-fixture', 'Bearer cron-fixture']) assert.equal(recoveryAuthorization(value, env), 'authorized');
  for (const value of [null, '', 'job-fixture', 'bearer job-fixture', 'Bearer job-fixture ', 'Bearer wrong']) assert.equal(recoveryAuthorization(value, env), 'unauthorized');
  assert.equal(recoveryAuthorization('Bearer cron-fixture', { MEMBERSHIP_JOB_SECRET: 'job-fixture' }), 'unauthorized');
});
const env = { MEMBERSHIP_RECOVERY_APPROVED: 'true', MEMBERSHIP_RECOVERY_TARGET_ENV: 'preview', MEMBERSHIP_BILLING_MODE: 'test', MEMBERSHIP_RECOVERY_ORIGIN: 'https://staging.example.test', MEMBERSHIP_JOB_SECRET: 'x'.repeat(32) };
test('manual recovery requires approved exact HTTPS sandbox and bounded cadence', () => {
  assert.equal(recoveryOptions(env).invocations, 1);
  for (const patch of [
    { MEMBERSHIP_RECOVERY_APPROVED: 'false' }, { MEMBERSHIP_RECOVERY_TARGET_ENV: 'production' },
    { MEMBERSHIP_BILLING_MODE: 'live' }, { MEMBERSHIP_LIVE_ENABLED: 'true' },
    { MEMBERSHIP_RECOVERY_ORIGIN: 'https://staging.example.test/path' }, { MEMBERSHIP_RECOVERY_ORIGIN: 'http://staging.example.test' },
    { MEMBERSHIP_RECOVERY_ORIGIN: 'https://user:pass@staging.example.test' }, { MEMBERSHIP_RECOVERY_ORIGIN: 'https://localhost' },
    { MEMBERSHIP_RECOVERY_INVOCATIONS: '21' }, { MEMBERSHIP_RECOVERY_INTERVAL_SECONDS: '59' }, { MEMBERSHIP_RECOVERY_TIMEBOX_SECONDS: '1201' },
  ]) assert.throws(() => recoveryOptions({ ...env, ...patch }));
});
test('manual recovery fixes destination, blocks redirects and reports only numeric health', async () => {
  const reports: unknown[] = [];
  const transport: typeof fetch = async (input, init) => {
    assert.equal(input, 'https://staging.example.test/api/membership/process');
    assert.equal(init?.redirect, 'error');
    assert.equal(new Headers(init?.headers).get('x-membership-recovery-mode'), 'sandbox');
    return Response.json({ billingMode: 'test', deploymentEnvironment: 'preview', processed: 2, billing: 1, email: 1, privateToken: 'must-never-print', queues: { email: { pending: 0, payload: 'must-never-print' } } });
  };
  await runBoundedRecovery(env, transport, value => reports.push(value));
  assert.equal(reports.length, 1);
  assert.ok(!JSON.stringify(reports).includes('must-never-print'));
  await assert.rejects(runBoundedRecovery(env, async () => Response.json({ billingMode: 'live' }), () => {}));
});
test('process endpoint denies unconfigured, unauthorized and live sandbox requests before queue access', async () => {
  const previous = { ...process.env };
  try {
    delete process.env.MEMBERSHIP_JOB_SECRET; delete process.env.CRON_SECRET;
    let response = await GET(new Request('https://staging.example.test/api/membership/process'));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    process.env.MEMBERSHIP_JOB_SECRET = 'endpoint-fixture';
    response = await GET(new Request('https://staging.example.test/api/membership/process', { headers: { authorization: 'Bearer wrong' } }));
    assert.equal(response.status, 401);
    process.env.MEMBERSHIP_BILLING_MODE = 'live';
    response = await GET(new Request('https://staging.example.test/api/membership/process', { headers: { authorization: 'Bearer endpoint-fixture', 'x-membership-recovery-mode': 'sandbox' } }));
    assert.equal(response.status, 409);
  } finally { process.env = previous; }
});
