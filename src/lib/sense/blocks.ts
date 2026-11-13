/**
 * The writing room edits a note one block at a time: paragraphs, headings, lists and quotes
 * separated by blank lines. A fenced code block stays whole even if it has blank lines inside.
 */
export function toBlocks(body: string): string[] {
  const blocks: string[] = [];
  let current: string[] = [];
  let fenced = false;
  for (const line of body.replace(/\r\n/g, '\n').split('\n')) {
    if (/^\s*```/.test(line)) fenced = !fenced;
    if (!fenced && line.trim() === '') {
      if (current.length) blocks.push(current.join('\n'));
      current = [];
      continue;
    }
    current.push(line);
  }
  if (current.length) blocks.push(current.join('\n'));
  return blocks.length ? blocks : [''];
}

/** Blocks back to markdown: one blank line between them, empty blocks dropped. */
export function fromBlocks(blocks: string[]): string {
  const text = blocks.map(block => block.replace(/\s+$/, '')).filter(Boolean).join('\n\n');
  return text ? text + '\n' : '';
}

export function wordCount(text: string): number {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, '$1')
    .replace(/[#>*_`\-]/g, ' ')
    .split(/\s+/).filter(Boolean).length;
}

/** `## Heading` → { level: 2, text: 'Heading' }, or null for anything that isn't a heading. */
export function heading(block: string): { level: number; text: string } | null {
  const match = /^(#{1,3})\s+(.+)$/.exec(block.split('\n')[0]);
  return match ? { level: match[1].length, text: match[2].replace(/\[\[([^\]|]+)(\|([^\]]+))?\]\]/g, (_, t, __, alias) => alias ?? t).trim() } : null;
}

/**
 * Where a click in the formatted text lands in the raw markdown. Formatting hides characters
 * (`**`, `[[`), so match the few words before the click instead of counting characters.
 */
export function caretFromRendered(raw: string, renderedBefore: string, renderedTotal: number): number {
  if (!renderedBefore) return 0;
  const ratio = renderedTotal ? renderedBefore.length / renderedTotal : 1;
  const guess = Math.round(ratio * raw.length);
  for (let size = Math.min(16, renderedBefore.length); size >= 3; size -= 4) {
    const snippet = renderedBefore.slice(-size);
    let best = -1;
    for (let at = raw.indexOf(snippet); at !== -1; at = raw.indexOf(snippet, at + 1)) {
      if (best === -1 || Math.abs(at + size - guess) < Math.abs(best + size - guess)) best = at;
    }
    if (best !== -1) return best + size;
  }
  return Math.min(guess, raw.length);
}

/** Enter inside a list or quote: the marker to continue with, or 'end' on an empty item (which ends the list). */
export function continuation(lineBeforeCaret: string): string | 'end' | null {
  const list = /^(\s*)([-*+]|(\d+)\.)(\s+)(.*)$/.exec(lineBeforeCaret);
  if (list) {
    if (!list[5].trim()) return 'end';
    return list[1] + (list[3] ? `${Number(list[3]) + 1}.` : list[2]) + list[4];
  }
  const quote = /^(>\s?)(.*)$/.exec(lineBeforeCaret);
  if (quote) return quote[2].trim() ? quote[1] : 'end';
  return null;
}
