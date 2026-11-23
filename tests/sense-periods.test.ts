import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, daysBetween, isDate, isPeriod, periodRange, previousRange } from '../src/lib/sense/periods';

test('finds the period that holds a date', () => {
  // 23 November 2026 is a Monday.
  assert.deepEqual(periodRange('day', '2026-11-23'), { start: '2026-11-23', end: '2026-11-23' });
  assert.deepEqual(periodRange('week', '2026-11-23'), { start: '2026-11-23', end: '2026-11-29' });
  assert.deepEqual(periodRange('week', '2026-11-29'), { start: '2026-11-23', end: '2026-11-29' });
  assert.deepEqual(periodRange('month', '2026-11-23'), { start: '2026-11-01', end: '2026-11-30' });
  assert.deepEqual(periodRange('quarter', '2026-11-23'), { start: '2026-10-01', end: '2026-12-31' });
  assert.deepEqual(periodRange('year', '2026-11-23'), { start: '2026-01-01', end: '2026-12-31' });
  assert.deepEqual(periodRange('month', '2028-02-10'), { start: '2028-02-01', end: '2028-02-29' });
  assert.deepEqual(periodRange('week', '2027-01-01'), { start: '2026-12-28', end: '2027-01-03' });
});

test('finds the period before', () => {
  assert.deepEqual(previousRange('day', '2026-11-23'), { start: '2026-11-22', end: '2026-11-22' });
  assert.deepEqual(previousRange('week', '2026-11-25'), { start: '2026-11-16', end: '2026-11-22' });
  assert.deepEqual(previousRange('quarter', '2026-02-01'), { start: '2025-10-01', end: '2025-12-31' });
  assert.deepEqual(previousRange('year', '2026-06-01'), { start: '2025-01-01', end: '2025-12-31' });
});

test('counts and checks dates', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(daysBetween('2026-11-23', '2026-11-30'), 7);
  assert.equal(isDate('2026-11-23'), true);
  assert.equal(isDate('2026-02-30'), false);
  assert.equal(isDate('23/11/2026'), false);
  assert.equal(isPeriod('week'), true);
  assert.equal(isPeriod('decade'), false);
});
