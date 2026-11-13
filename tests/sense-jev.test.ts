import { test } from 'node:test';
import assert from 'node:assert/strict';
import { askJev, context, jevError, rawRequest, readableTime, safeTimeZone, toApiQuestions } from '../src/lib/sense/jev';

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

test('passes yes/no definitions as criteria only when given', () => {
  assert.deepEqual(toApiQuestions([{ kind: 'noul', ask: 'On a retreat', yes: 'Mentions a retreat this month', no: ' ' }]).q1,
    { type: 'noul', instructions: 'On a retreat', criteria: { true: 'Mentions a retreat this month', false: null } });
  assert.equal('criteria' in toApiQuestions([{ kind: 'noul', ask: 'On a retreat', yes: '', no: '' }]).q1, false);
});

test('tells Jev who “I” is and what time it is', () => {
  assert.equal(safeTimeZone('America/Chicago'), 'America/Chicago');
  assert.equal(safeTimeZone('Not/AZone'), 'UTC');
  assert.equal(safeTimeZone(42), 'UTC');
  assert.match(readableTime('2026-11-13T16:42:00Z', 'America/Chicago'), /^Fri,? 13 Nov 2026, 10:42$/);
  const head = context('channel', 'UTC', 'inbox');
  assert.match(head.about, /#inbox/);
  assert.match(head.about, /“I”, “me” and “my” mean Matthew/);
  assert.match(head.now, /\(UTC\)$/);
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

test('shows the raw request as sent, with the key hidden', () => {
  const saved = process.env.TYPESAFE_API_KEY;
  process.env.TYPESAFE_API_KEY = 'tsk_secret_for_test';
  try {
    const questions = toApiQuestions([{ kind: 'noul', ask: 'Needs my attention' }]);
    const request = rawRequest({ text: 'hello' }, questions);
    assert.equal(request.method, 'POST');
    assert.match(request.url, /\/v1\/systemone$/);
    assert.deepEqual(request.body, { model: 'jev-latest', state: { text: 'hello' }, questions });
    assert.equal(JSON.stringify(request).includes('tsk_secret_for_test'), false);
  } finally {
    if (saved === undefined) delete process.env.TYPESAFE_API_KEY; else process.env.TYPESAFE_API_KEY = saved;
  }
});

test('keeps each call’s raw exchange, including the error TypeSafe sent back', async () => {
  const saved = { key: process.env.TYPESAFE_API_KEY, fetch: globalThis.fetch };
  process.env.TYPESAFE_API_KEY = 'tsk_secret_for_test';
  const sent: RequestInit[] = [];
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'set-cookie': 'a=b' } });
  try {
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      sent.push(init);
      return reply(422, { detail: [{ loc: ['body', 'questions'], msg: 'Field required', type: 'missing' }] });
    }) as typeof fetch;
    const failed = await askJev({ kind: 'text', text: 'hello' }, [{ kind: 'noul', ask: 'Needs my attention' }]);
    assert.match(failed.runs[0].error ?? '', /Field required/);
    assert.equal(failed.raw[0].response?.status, 422);
    const response = failed.raw[0].response as { headers: Record<string, string>; body: { detail: unknown[] } };
    assert.equal(response.body.detail.length, 1);
    assert.equal('set-cookie' in response.headers, false);
    // The real key goes to TypeSafe; the copy shown in the panel has it hidden.
    assert.equal((sent[0].headers as Record<string, string>).Authorization, 'Bearer tsk_secret_for_test');
    assert.equal(JSON.stringify(failed).includes('tsk_secret_for_test'), false);

    globalThis.fetch = (async () => reply(200, { model: 'jev-1.14.0', answers: { q1: { type: 'noul', noul: 0.9 } }, usage: { input_tokens: 1000, output_tokens: 8 } })) as typeof fetch;
    const ok = await askJev({ kind: 'text', text: 'hello' }, [{ kind: 'noul', ask: 'Needs my attention' }]);
    assert.equal(ok.runs[0].error, undefined);
    assert.deepEqual(ok.runs[0].answers, { q1: { type: 'noul', noul: 0.9 } });
    assert.equal(ok.model, 'jev-1.14.0');
    assert.equal(ok.inputTokens, 1000);
  } finally {
    globalThis.fetch = saved.fetch;
    if (saved.key === undefined) delete process.env.TYPESAFE_API_KEY; else process.env.TYPESAFE_API_KEY = saved.key;
  }
});
