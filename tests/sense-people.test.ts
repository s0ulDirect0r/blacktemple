import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanCadence, cleanNote, dueIn } from '../src/lib/sense/people';

test('knows when it’s time to be in touch', () => {
  assert.equal(dueIn({ cadenceDays: 14, lastTalked: '2026-11-16' }, '2026-11-23'), 7);
  assert.equal(dueIn({ cadenceDays: 7, lastTalked: '2026-11-16' }, '2026-11-23'), 0);
  assert.equal(dueIn({ cadenceDays: 7, lastTalked: '2026-11-01' }, '2026-11-23'), -15);
  // Never talked: due now. No rhythm: never due.
  assert.equal(dueIn({ cadenceDays: 30, lastTalked: null }, '2026-11-23'), 0);
  assert.equal(dueIn({ cadenceDays: null, lastTalked: '2026-01-01' }, '2026-11-23'), null);
});

test('checks the note and the rhythm', () => {
  assert.equal(cleanNote('  met at the retreat\r\nlikes tea  \n'), '  met at the retreat\nlikes tea');
  assert.equal(cleanNote(undefined), '');
  assert.throws(() => cleanNote(5), /text/);
  assert.equal(cleanCadence(null), null);
  assert.equal(cleanCadence(30), 30);
  assert.throws(() => cleanCadence(0), /between 1 and 365/);
  assert.throws(() => cleanCadence('30'), /between 1 and 365/);
});
