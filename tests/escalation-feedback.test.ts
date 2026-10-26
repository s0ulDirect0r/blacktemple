import assert from 'node:assert/strict';
import test from 'node:test';
import { clientIp, errorFingerprint, parseFeedback } from '../src/lib/escalation/feedback';

const png = (extra = 0) => 'data:image/png;base64,' + Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(extra)]).toString('base64');

test('feedback keeps known context and drops the rest', () => {
  const input = parseFeedback({ kind: 'hard', text: '  too many bats  ', context: { arena: 'Crypt\n', wave: 7.9, seconds: 312.4, killer: 'Bat', fps: 58, build: 'abc', screen: 'dead', extra: 'x' } });
  assert.deepEqual(
    { kind: input.kind, text: input.text, arena: input.arena, wave: input.wave, screen: input.screen, shot: input.shot, errors: input.errors },
    { kind: 'hard', text: 'too many bats', arena: 'Crypt', wave: 7, screen: 'dead', shot: null, errors: null },
  );
  assert.equal(parseFeedback({ kind: 'fun', context: { wave: -1, fps: Infinity, screen: 'lobby' } }).wave, null);
});

test('feedback rejects bad kinds, long notes and empty notes', () => {
  for (const body of [null, [], { kind: 'love' }, { kind: 'fun', text: 'x'.repeat(501) }, { kind: 'note' }, { kind: 'note', text: '   ' }]) {
    assert.throws(() => parseFeedback(body), String(JSON.stringify(body)));
  }
});

test('screenshots must be real, small PNGs and only come with broken', () => {
  assert.equal(parseFeedback({ kind: 'broken', shot: png(100) })!.shot!.length, 108);
  assert.equal(parseFeedback({ kind: 'fun', shot: png(100) }).shot, null);
  assert.throws(() => parseFeedback({ kind: 'broken', shot: 'data:image/svg+xml;base64,PHN2Zz4=' }));
  assert.throws(() => parseFeedback({ kind: 'broken', shot: 'data:image/png;base64,' + Buffer.from('<svg>').toString('base64') }));
  assert.throws(() => parseFeedback({ kind: 'broken', shot: png(300 * 1024) }), /too large/);
});

test('errors are capped and only kept with broken', () => {
  const errors = Array.from({ length: 20 }, (_, i) => 'e'.repeat(600) + i);
  const input = parseFeedback({ kind: 'broken', errors: [...errors, 42] });
  assert.equal(input.errors!.length, 10);
  assert.ok(input.errors!.every(e => e.length === 500));
  assert.equal(parseFeedback({ kind: 'fun', errors }).errors, null);
});

test('error reports need an error and carry its fingerprint', () => {
  const input = parseFeedback({ kind: 'error', errors: ['TypeError: x is undefined\n  at tick (main.js:12:4)'], context: { arena: 'tutorial', wave: 2 } });
  assert.equal(input.errors!.length, 1);
  assert.equal(input.fingerprint, errorFingerprint('TypeError: x is undefined'));
  assert.equal(parseFeedback({ kind: 'broken', errors: ['x'] }).fingerprint, null);
  assert.throws(() => parseFeedback({ kind: 'error' }), /Send the error/);
  assert.throws(() => parseFeedback({ kind: 'error', errors: [42] }), /Send the error/);
});

test('one error keeps one fingerprint across line numbers', () => {
  assert.equal(errorFingerprint('RangeError at main.js:12:4\nstack'), errorFingerprint('RangeError at main.js:980:17'));
  assert.notEqual(errorFingerprint('RangeError: a'), errorFingerprint('TypeError: a'));
});

test('client IP is the first forwarded address', () => {
  assert.equal(clientIp(new Request('http://x', { headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' } })), '1.2.3.4');
  assert.equal(clientIp(new Request('http://x')), 'unknown');
});
