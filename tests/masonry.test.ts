import test from 'node:test';
import assert from 'node:assert/strict';

import { aspectRatioOf, distributeColumns, PLACEHOLDER_RATIO } from '@/lib/masonry';

interface Item {
  id: string;
  ratio: number;
}

const ratioOf = (item: Item) => item.ratio;

test('distributeColumns keeps input order within each column', () => {
  const items: Item[] = [
    { id: 'a', ratio: 1 },
    { id: 'b', ratio: 1 },
    { id: 'c', ratio: 1 },
    { id: 'd', ratio: 1 },
  ];

  const columns = distributeColumns(items, 2, ratioOf);

  assert.deepEqual(columns.map((col) => col.map((i) => i.id)), [['a', 'c'], ['b', 'd']]);
});

test('distributeColumns places the next item in the shortest column', () => {
  // A tall portrait (0.5 => height 2) followed by squares: squares should
  // fill the other column until it catches up.
  const items: Item[] = [
    { id: 'tall', ratio: 0.5 },
    { id: 's1', ratio: 1 },
    { id: 's2', ratio: 1 },
    { id: 's3', ratio: 1 },
  ];

  const columns = distributeColumns(items, 2, ratioOf);

  assert.deepEqual(columns[0].map((i) => i.id), ['tall', 's3']);
  assert.deepEqual(columns[1].map((i) => i.id), ['s1', 's2']);
});

test('distributeColumns always returns at least one column', () => {
  const columns = distributeColumns([{ id: 'a', ratio: 1 }], 0, ratioOf);
  assert.equal(columns.length, 1);
  assert.equal(columns[0][0].id, 'a');
});

test('aspectRatioOf returns null for missing or invalid dimensions', () => {
  assert.equal(aspectRatioOf(undefined, undefined), null);
  assert.equal(aspectRatioOf(0, 100), null);
  assert.equal(aspectRatioOf(null, 100), null);
  assert.equal(aspectRatioOf(1600, 900), 1600 / 900);
  assert.ok(PLACEHOLDER_RATIO > 0 && PLACEHOLDER_RATIO < 1);
});
