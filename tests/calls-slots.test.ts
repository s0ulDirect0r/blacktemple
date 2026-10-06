import test from 'node:test';
import assert from 'node:assert/strict';

import { computeSlots, mergeIntervals } from '@/lib/calls/slots';

const HOUR = 3_600_000;
const at = (iso: string) => Date.parse(iso);
const iso = (ms: number) => new Date(ms).toISOString();

const window = (start: string, end: string) => ({ start: at(start), end: at(end) });

test('cuts a window into back-to-back call slots', () => {
  const slots = computeSlots({
    windows: [window('2026-10-06T19:00:00Z', '2026-10-06T22:00:00Z')],
    busy: [],
    durationMs: HOUR,
    earliest: 0,
    latest: Infinity,
  });
  assert.deepEqual(slots.map(iso), ['2026-10-06T19:00:00.000Z', '2026-10-06T20:00:00.000Z', '2026-10-06T21:00:00.000Z']);
});

test('drops slots that overlap busy time, but not ones that only touch it', () => {
  const slots = computeSlots({
    windows: [window('2026-10-06T19:00:00Z', '2026-10-06T22:00:00Z')],
    busy: [
      window('2026-10-06T20:30:00Z', '2026-10-06T20:45:00Z'),
      window('2026-10-06T18:00:00Z', '2026-10-06T19:00:00Z'),
    ],
    durationMs: HOUR,
    earliest: 0,
    latest: Infinity,
  });
  assert.deepEqual(slots.map(iso), ['2026-10-06T19:00:00.000Z', '2026-10-06T21:00:00.000Z']);
});

test('respects minimum notice', () => {
  const slots = computeSlots({
    windows: [window('2026-10-06T19:00:00Z', '2026-10-06T22:00:00Z')],
    busy: [],
    durationMs: HOUR,
    earliest: at('2026-10-06T19:30:00Z'),
    latest: Infinity,
  });
  assert.deepEqual(slots.map(iso), ['2026-10-06T20:00:00.000Z', '2026-10-06T21:00:00.000Z']);
});

test('drops slots that run past the latest end', () => {
  // The window is open until 10pm, but busy time was only fetched until 9:30pm.
  const slots = computeSlots({
    windows: [window('2026-10-06T19:00:00Z', '2026-10-06T22:00:00Z')],
    busy: [],
    durationMs: HOUR,
    earliest: 0,
    latest: at('2026-10-06T21:30:00Z'),
  });
  assert.deepEqual(slots.map(iso), ['2026-10-06T19:00:00.000Z', '2026-10-06T20:00:00.000Z']);
});

test('joins touching windows and skips windows shorter than a call', () => {
  const slots = computeSlots({
    windows: [
      window('2026-10-06T19:30:00Z', '2026-10-06T20:00:00Z'),
      window('2026-10-06T20:00:00Z', '2026-10-06T21:30:00Z'),
      window('2026-10-07T15:00:00Z', '2026-10-07T15:45:00Z'),
    ],
    busy: [],
    durationMs: HOUR,
    earliest: 0,
    latest: Infinity,
  });
  assert.deepEqual(slots.map(iso), ['2026-10-06T19:30:00.000Z', '2026-10-06T20:30:00.000Z']);
});

test('mergeIntervals sorts, merges overlaps, and ignores empty intervals', () => {
  assert.deepEqual(
    mergeIntervals([
      { start: 5, end: 8 },
      { start: 1, end: 3 },
      { start: 2, end: 4 },
      { start: 9, end: 9 },
    ]),
    [
      { start: 1, end: 4 },
      { start: 5, end: 8 },
    ],
  );
});
