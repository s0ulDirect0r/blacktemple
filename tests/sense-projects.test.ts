import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanDescription, cleanName, cleanTask, cleanTasks } from '../src/lib/sense/projects';

test('a project needs a name, tidied to one line', () => {
  assert.equal(cleanName('  Scout   NYC\n'), 'Scout NYC');
  assert.throws(() => cleanName('   '), /name/);
  assert.throws(() => cleanName(undefined), /name/);
  assert.throws(() => cleanName('x'.repeat(121)), /120/);
});

test('a description is optional and keeps its line breaks', () => {
  assert.equal(cleanDescription(undefined), '');
  assert.equal(cleanDescription('  one\r\ntwo  '), 'one\ntwo');
  assert.throws(() => cleanDescription(42), /text/);
  assert.throws(() => cleanDescription('x'.repeat(5001)), /5,000/);
});

test('tasks are trimmed, and blank ones sent with a new project are skipped', () => {
  assert.equal(cleanTask('  Look at   one listing '), 'Look at one listing');
  assert.throws(() => cleanTask(''), /task/);
  assert.throws(() => cleanTask('x'.repeat(501)), /500/);
  assert.deepEqual(cleanTasks(['First', '  ', 'Second ', 7]), ['First', 'Second']);
  assert.deepEqual(cleanTasks(undefined), []);
  assert.throws(() => cleanTasks('First'), /list/);
  assert.throws(() => cleanTasks(Array.from({ length: 101 }, () => 'x')), /100/);
});
