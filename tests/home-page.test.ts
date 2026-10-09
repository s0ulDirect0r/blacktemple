import test from 'node:test';
import assert from 'node:assert/strict';
import Home from '@/app/page';

test('Home leaves the home zone scene to LayoutContent', () => {
  assert.equal(Home(), null);
});
