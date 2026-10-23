import assert from 'node:assert/strict';
import test from 'node:test';
import { extractLinks, extractTags, linkKey, toRenderableMarkdown } from '../src/lib/sense/text';

test('links are found once each, case-insensitively, with aliases', () => {
  assert.deepEqual(extractLinks('see [[Wave 7 wall]] and [[wave 7  WALL|the wall]] and [[The Machine]]'), [
    { key: 'wave 7 wall', title: 'Wave 7 wall' },
    { key: 'the machine', title: 'The Machine' },
  ]);
  assert.equal(linkKey('  The   Machine '), 'the machine');
});

test('tags need a word boundary and skip headings, anchors and code', () => {
  assert.deepEqual(extractTags('#balance and (#Art) but not a#b, # heading, `#code` or\n```\n#fenced\n```'), ['balance', 'art']);
  assert.deepEqual(extractLinks('`[[not a link]]` [[real]]').map(l => l.key), ['real']);
});

test('rendering turns links and tags into sense: links but leaves code alone', () => {
  const out = toRenderableMarkdown('go to [[Wave 7 wall|the wall]] #balance `[[raw]]`');
  assert.equal(out, 'go to [the wall](sense:note/Wave%207%20wall) [#balance](sense:tag/balance) `[[raw]]`');
});
