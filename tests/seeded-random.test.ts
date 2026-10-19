import test from 'node:test';
import assert from 'node:assert/strict';
import { seededRandom } from '@/lib/seeded-random';

test('procedural render samples repeat for the same index and seed', () => {
  const first = Array.from({ length: 5000 }, (_, i) => seededRandom(i, 101));
  assert.deepEqual(first, Array.from({ length: 5000 }, (_, i) => seededRandom(i, 101)));
  assert.ok(first.every(value => value >= 0 && value < 1));
  assert.equal(new Set(first).size, first.length);
  assert.notDeepEqual(first, Array.from({ length: 5000 }, (_, i) => seededRandom(i, 102)));
});
