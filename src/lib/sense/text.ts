// [[Wiki links]] and #tags in Sense posts and notes. Shared by the server
// (indexing) and the browser (rendering), so it has no server imports.

const LINK = /\[\[([^\[\]|\n]{1,200})(?:\|([^\[\]\n]{1,200}))?\]\]/g;
const TAG = /(^|[\s(])#([a-z0-9][a-z0-9_-]{0,39})(?![a-z0-9_-])/gi;

/** Blank out fenced and inline code so links and tags inside code are ignored. */
function withoutCode(text: string) {
  return text.replace(/```[\s\S]*?(```|$)/g, m => ' '.repeat(m.length)).replace(/`[^`\n]*`/g, m => ' '.repeat(m.length));
}

/** How a note title is matched: case- and surrounding-space-insensitive. */
export function linkKey(title: string) {
  return title.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function extractLinks(text: string): { key: string; title: string }[] {
  const seen = new Map<string, string>();
  for (const match of withoutCode(text).matchAll(LINK)) {
    const title = match[1].trim().replace(/\s+/g, ' ');
    if (title && !seen.has(linkKey(title))) seen.set(linkKey(title), title);
  }
  return [...seen].map(([key, title]) => ({ key, title }));
}

export function extractTags(text: string): string[] {
  const tags = new Set<string>();
  for (const match of withoutCode(text).matchAll(TAG)) tags.add(match[2].toLowerCase());
  return [...tags];
}

/**
 * Rewrite [[links]] and #tags as markdown links on a private `sense:` scheme
 * so the renderer can turn them into in-app navigation. Code is left alone.
 */
export function toRenderableMarkdown(text: string): string {
  const parts = text.split(/(```[\s\S]*?(?:```|$)|`[^`\n]*`)/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) return part;
    return part
      .replace(LINK, (_, title: string, alias?: string) => `[${(alias ?? title).trim()}](sense:note/${encodeURIComponent(title.trim())})`)
      .replace(TAG, (_, lead: string, tag: string) => `${lead}[#${tag}](sense:tag/${tag.toLowerCase()})`);
  }).join('');
}
