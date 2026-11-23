import { test } from 'node:test';
import assert from 'node:assert/strict';
import { streaks } from '../src/lib/sense/periods';

test('counts the current run, the best run and the total', () => {
  const days = ['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23'];
  assert.deepEqual(streaks(days, '2026-11-23'), { current: 4, best: 4, total: 8 });
  assert.deepEqual(streaks(days.slice(0, 5), '2026-11-23'), { current: 0, best: 4, total: 5 });
  assert.deepEqual(streaks([], '2026-11-23'), { current: 0, best: 0, total: 0 });
});

test('a run survives until the end of today', () => {
  // Done yesterday but not yet today: the chain isn't broken.
  assert.equal(streaks(['2026-11-21', '2026-11-22'], '2026-11-23').current, 2);
  // Missed yesterday: it is.
  assert.equal(streaks(['2026-11-20', '2026-11-21'], '2026-11-23').current, 0);
  // Runs cross month and year ends.
  assert.equal(streaks(['2026-12-31', '2027-01-01'], '2027-01-01').current, 2);
});
