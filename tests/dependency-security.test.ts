import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const require = createRequire(import.meta.url);
const braces = require('braces') as {
  (pattern: string, options?: Record<string, unknown>): string[];
  expand(pattern: string, options?: Record<string, unknown>): string[];
  compile(pattern: string, options?: Record<string, unknown>): string;
  stringify(pattern: string): string;
};
const { sprintf, vsprintf } = require('sprintf-js') as {
  sprintf: (format: string, ...args: unknown[]) => string;
  vsprintf: (format: string, args: unknown[]) => string;
};

function runIsolated(source: string) {
  const result = spawnSync(process.execPath, ['--eval', source], { encoding: 'utf8', timeout: 3000 });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, result.stderr);
}

test('local security patches are applied with exact source checksums', () => {
  const result = spawnSync(process.execPath, ['scripts/apply-dependency-security-patches.mjs', '--check'], {
    encoding: 'utf8', timeout: 3000,
  });
  assert.equal(result.status, 0, result.stderr);
});

test('braces preserves alternatives, ranges, parentheses and invalid-literal behavior', () => {
  assert.deepEqual(braces.expand('src/{a,{b,c}}/{1..3}'), [
    'src/a/1', 'src/a/2', 'src/a/3', 'src/b/1', 'src/b/2', 'src/b/3', 'src/c/1', 'src/c/2', 'src/c/3',
  ]);
  assert.equal(braces.compile('src/{a,b}'), 'src/(a|b)');
  assert.equal(braces.stringify('a/(b)/{c,d}'), 'a/(b)/{c,d}');
  assert.deepEqual(braces('a{broken'), ['a{broken']);
  assert.equal(braces.stringify('('.repeat(128) + 'x' + ')'.repeat(128)), '('.repeat(128) + 'x' + ')'.repeat(128));
});

test('braces counts actual AST nesting rather than escaped or quoted literals', () => {
  const literal = '{'.repeat(5000);
  assert.equal(braces.stringify('"' + literal + '"'), literal);
  assert.equal(braces.stringify('\\{'.repeat(5000)), literal);
  assert.equal(braces.stringify('[' + literal + ']'), '[' + literal + ']');
});

test('braces rejects nested inputs under maxLength before recursive stack exhaustion', () => {
  runIsolated(`
    const assert = require('node:assert/strict'), braces = require('braces');
    for (const [open, close] of [['{', '}'], ['(', ')']]) {
      const input = open.repeat(3000) + 'x' + close.repeat(3000);
      for (const method of ['parse', 'compile', 'expand', 'stringify']) {
        assert.throws(() => braces[method](input), { name: 'SyntaxError', message: /nesting exceeds local safety limit/ });
      }
      assert.throws(() => braces(input), { name: 'SyntaxError', message: /nesting exceeds local safety limit/ });
      assert.throws(() => braces(input, { expand: true }), { name: 'SyntaxError', message: /nesting exceeds local safety limit/ });
    }
    assert.throws(() => braces.parse('{'.repeat(5000)), { name: 'SyntaxError', message: /nesting exceeds local safety limit/ });
  `);
});

test('braces rejects supplied deeply nested and cyclic ASTs at public walker entry points', () => {
  runIsolated(`
    const assert = require('node:assert/strict'), braces = require('braces');
    for (const method of ['compile', 'expand', 'stringify']) {
      const root = { type: 'root', nodes: [] }; let node = root;
      for (let i = 0; i < 5000; i++) {
        const child = { type: 'paren', nodes: [], parent: node };
        node.nodes.push(child); node = child;
      }
      node.nodes.push({ type: 'text', value: 'x' });
      assert.throws(() => braces[method](root), { name: 'SyntaxError', message: /nesting exceeds local safety limit/ });
      const cyclic = { type: 'root', nodes: [] }; cyclic.nodes.push(cyclic);
      assert.throws(() => braces[method](cyclic), { name: 'SyntaxError', message: /nesting exceeds local safety limit/ });
    }
  `);
});

test('sprintf preserves normal numeric, positional, named and string precision output', () => {
  assert.equal(sprintf('%.2f %.2e %.3g', 1.234, 1.234, 1.234), '1.23 1.23e+0 1.23');
  assert.equal(sprintf('%2$s %1$d', 42, 'answer'), 'answer 42');
  assert.equal(sprintf('%(name)s', { name: 'member' }), 'member');
  assert.equal(vsprintf('%.2f %s', [1.234, 'USD']), '1.23 USD');
  assert.equal(sprintf('%.0f %.0e', 1.9, 1.9), '2 2e+0');
  assert.equal(sprintf('%.1g', 1.9), '2');
  assert.equal(sprintf('%.100f', 1), (1).toFixed(100));
  assert.equal(sprintf('%.100e', 1), (1).toExponential(100));
  assert.equal(sprintf('%.100g', 1), (1).toPrecision(100));
  assert.equal(sprintf('%.100000s', 'member'), 'member');
});

test('sprintf rejects excessive numeric precision before argument evaluation or native formatting', () => {
  for (const format of ['%.101f', '%.1000000e', '%.9999999999999999999999999999g', '%.0g']) {
    let called = false;
    assert.throws(() => sprintf(format, () => { called = true; return 1; }), {
      name: 'SyntaxError', message: /numeric precision is outside the supported range/,
    });
    assert.equal(called, false);
    assert.throws(() => vsprintf(format, [1]), { name: 'SyntaxError' });
  }
});

test('sprintf validates manually supplied or cached parse trees at the formatter boundary', () => {
  runIsolated(`
    const assert = require('node:assert/strict'), { sprintf } = require('sprintf-js');
    const tree = sprintf.parse('%.2f'); tree[0][7] = '1000000000';
    assert.throws(() => sprintf.format(tree, ['%.2f', 1]), { name: 'SyntaxError' });
    sprintf.cache['%.2f'] = tree;
    assert.throws(() => sprintf('%.2f', 1), { name: 'SyntaxError' });
  `);
});
