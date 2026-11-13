import { test } from 'node:test';
import assert from 'node:assert/strict';
import { caretFromRendered, continuation, fromBlocks, heading, toBlocks, wordCount } from '../src/lib/sense/blocks';

test('splits a note into blocks on blank lines and joins it back', () => {
  const body = '# Title\n\nFirst paragraph\nstill first.\n\n\n- one\n- two\n';
  const blocks = toBlocks(body);
  assert.deepEqual(blocks, ['# Title', 'First paragraph\nstill first.', '- one\n- two']);
  assert.equal(fromBlocks(blocks), '# Title\n\nFirst paragraph\nstill first.\n\n- one\n- two\n');
});

test('keeps a fenced code block whole across blank lines', () => {
  assert.deepEqual(toBlocks('Before\n\n```\na\n\nb\n```\n\nAfter'), ['Before', '```\na\n\nb\n```', 'After']);
});

test('an empty note is one empty block, and empty blocks are dropped on save', () => {
  assert.deepEqual(toBlocks(''), ['']);
  assert.equal(fromBlocks(['', 'Text', '  ']), 'Text\n');
  assert.equal(fromBlocks(['']), '');
});

test('counts words without markup', () => {
  assert.equal(wordCount('## A **bold** [[Linked note]] and ![pic](/x.png)'), 5);
});

test('reads headings for the outline', () => {
  assert.deepEqual(heading('## What a [[guest]] gives up'), { level: 2, text: 'What a guest gives up' });
  assert.equal(heading('Not a heading'), null);
  assert.equal(heading('#tag at the start'), null);
});

test('maps a click in formatted text to the raw markdown', () => {
  const raw = 'A guest’s work is **rented**. Every thought';
  const rendered = 'A guest’s work is rented. Every thought';
  const before = 'A guest’s work is rented. Ev';
  assert.equal(raw.slice(0, caretFromRendered(raw, before, rendered.length)), 'A guest’s work is **rented**. Ev');
  assert.equal(caretFromRendered(raw, '', rendered.length), 0);
});

test('continues lists and quotes, and ends them on an empty item', () => {
  assert.equal(continuation('- milk'), '- ');
  assert.equal(continuation('  3. third'), '  4. ');
  assert.equal(continuation('> said'), '> ');
  assert.equal(continuation('- '), 'end');
  assert.equal(continuation('>'), 'end');
  assert.equal(continuation('plain'), null);
});
