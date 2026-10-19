import assert from 'node:assert/strict';
import test from 'node:test';
import { queueProblems, type AlertSignals } from '../src/lib/membership/alerts';

const healthy: AlertSignals = { billingStuckSeconds: null, billingRepeatedFailures: 0, staleLeases: 0, emailFailedRecent: 0, emailWaitingSeconds: null };

test('a healthy or briefly busy queue raises no alert', () => {
  assert.deepEqual(queueProblems(healthy), []);
  assert.deepEqual(queueProblems({ ...healthy, billingStuckSeconds: 15 * 60, emailWaitingSeconds: 5 * 60 }), []);
});

test('stuck, failing and stale work each raise a problem a person can act on', () => {
  const problems = queueProblems({ billingStuckSeconds: 20 * 60, billingRepeatedFailures: 2, staleLeases: 1, emailFailedRecent: 1, emailWaitingSeconds: 6 * 60 });
  assert.deepEqual(problems.map(problem => problem.key), ['billing-stuck', 'billing-failing:2', 'stale-leases:1', 'email-failed:1', 'email-waiting']);
  assert.match(problems[0].message, /20 minutes/);
});

test('alert keys ignore how long a problem has lasted, so a persisting problem is not re-sent every run', () => {
  const at = (minutes: number) => queueProblems({ ...healthy, billingStuckSeconds: minutes * 60 }).map(problem => problem.key);
  assert.deepEqual(at(16), at(90));
});
