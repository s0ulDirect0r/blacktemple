import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jevError, toApiQuestions } from '../src/lib/sense/jev';

test('turns panel questions into Jev question objects', () => {
  const questions = toApiQuestions([
    { kind: 'noul', ask: 'Needs my attention' },
    { kind: 'choice', ask: 'What kind of post', options: ['idea', 'task: something to do', ' ', 'feeling'] },
    { kind: 'score', ask: 'How heated', levels: ['Calm', 'Mixed', 'Heated'] },
  ]);
  assert.deepEqual(questions, {
    q1: { type: 'noul', instructions: 'Needs my attention' },
    q2: { type: 'choice', instructions: 'What kind of post', criteria: { idea: 'idea', task: 'something to do', feeling: 'feeling' } },
    q3: { type: 'score', instructions: 'How heated', criteria: ['Calm', 'Mixed', 'Heated'] },
  });
});

test('refuses questions Jev would reject', () => {
  assert.throws(() => toApiQuestions([]), /at least one/);
  assert.throws(() => toApiQuestions([{ kind: 'noul', ask: '  ' }]), /empty/);
  assert.throws(() => toApiQuestions([{ kind: 'choice', ask: 'Pick', options: ['only one'] }]), /2 to 30 options/);
  assert.throws(() => toApiQuestions([{ kind: 'choice', ask: 'Pick', options: ['same', 'same'] }]), /repeated/);
  assert.throws(() => toApiQuestions([{ kind: 'score', ask: 'Rate', levels: ['a'] }]), /2 to 10 levels/);
  assert.throws(() => toApiQuestions(Array.from({ length: 13 }, () => ({ kind: 'noul', ask: 'x' }))), /Up to 12/);
});

test('explains TypeSafe errors briefly', () => {
  assert.equal(jevError(401, null).status, 502);
  assert.match(jevError(429, null).message, /busy/);
  assert.match(jevError(422, { detail: [{ loc: ['body'], msg: 'Field required', type: 'missing' }] }).message, /Field required/);
  assert.match(jevError(400, { detail: 'max_tokens_exceeded' }).message, /max_tokens_exceeded/);
});
