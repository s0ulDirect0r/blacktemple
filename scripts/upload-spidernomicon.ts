/**
 * Build the Spidernomicon lexicon from the archived Twitter thread.
 *
 *   npx tsx scripts/upload-spidernomicon.ts --thread /path/to/thread.json [--dry-run]
 *
 * thread.json is an array of { pos, tweet_id, date, text, images } in thread
 * order, where images are paths relative to the directory that holds the file.
 * Each tweet is one rune: `N. 'name'` on the first line, the meaning below.
 *
 * For every rune this uploads its images to Vercel Blob as
 * `spidernomicon/rune-<NNN>.jpg` (variants as `rune-<NNN>-<k>.jpg`), measures
 * them, and writes the whole lexicon to src/content/spidernomicon.ts.
 * `--dry-run` parses and reports without uploading or writing. Entries that
 * cannot be parsed are printed and the script exits non-zero.
 */
import { put } from '@vercel/blob';
import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import { imageSize } from 'image-size';
import path from 'path';

dotenv.config();

interface ThreadEntry {
  pos: number;
  tweet_id: string;
  date: string;
  text: string;
  images: string[];
}

interface ParsedRune {
  number: number;
  name: string;
  meaning: string;
}

interface RuneImage {
  url: string;
  width: number;
  height: number;
}

interface Rune extends ParsedRune {
  images: RuneImage[];
  tweetId: string;
  date: string;
}

const OUTPUT = path.join(process.cwd(), 'src', 'content', 'spidernomicon.ts');
const QUOTE = `['‘’"“”]`;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : 'true';
}

/**
 * Splits a tweet into { number, name, meaning }. Tolerates a leading @mention,
 * a preamble before the numbered line (the thread title on the first tweet, an
 * announcement on tweet 79), straight or curly quotes, an unclosed quote, and
 * unquoted names (the later runes are written in capitals without quotes).
 */
export function parseRuneText(text: string): ParsedRune | null {
  const lines = text
    .replace(/^(?:@\w+\s+)+/, '')
    .split('\n')
    .map((line) => line.trim());

  const start = lines.findIndex((line) => /^\d{1,3}\.\s*\S/.test(line));
  if (start === -1) return null;

  const head = /^(\d{1,3})\.\s*(.+)$/.exec(lines[start]);
  if (!head) return null;
  const number = Number(head[1]);
  const rest = head[2].trim();

  let name: string;
  let trailing = '';
  const quoted = new RegExp(`^${QUOTE}(.+?)${QUOTE}(?:\\s+(.*))?$`).exec(rest);
  if (quoted) {
    name = quoted[1].trim();
    trailing = quoted[2] ?? '';
  } else {
    // Unquoted (`84. GRATITUDE`) or an unclosed quote (`81. ‘The Invitation of Allness`).
    name = rest.replace(new RegExp(`^${QUOTE}+`), '').replace(new RegExp(`${QUOTE}+$`), '').trim();
  }
  if (!name) return null;

  const preamble = lines.slice(0, start).join('\n').trim();
  let meaning = [trailing, ...lines.slice(start + 1)]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Tweet 79 is the announcement that the runes become Sorceries, then just a
  // title. Keep his words as the meaning rather than leaving it blank.
  if (!meaning && preamble && !/SPIDERNOMICON/i.test(preamble)) meaning = preamble;

  return { number, name, meaning };
}

function pad3(n: number): string {
  return String(n).padStart(3, '0');
}

async function main() {
  const threadPath = arg('thread');
  if (!threadPath) {
    console.error('usage: --thread <thread.json> [--dry-run]');
    process.exit(1);
  }
  const dryRun = arg('dry-run') === 'true';
  const baseDir = path.dirname(path.resolve(threadPath));
  // Image paths in the archive are relative to the tweets/ folder, e.g. "spidernomicon/001_0.jpg".
  const imageRoot = path.basename(baseDir) === 'spidernomicon' ? path.dirname(baseDir) : baseDir;

  const entries: ThreadEntry[] = JSON.parse(await fs.readFile(threadPath, 'utf8'));
  const runes: Rune[] = [];
  const unparsed: ThreadEntry[] = [];
  let uploaded = 0;

  for (const entry of entries) {
    const parsed = parseRuneText(entry.text);
    if (!parsed) {
      unparsed.push(entry);
      continue;
    }
    if (parsed.number !== entry.pos + 1) {
      console.warn(`warning: entry ${entry.pos} parsed as rune ${parsed.number}`);
    }

    const images: RuneImage[] = [];
    for (const [k, rel] of entry.images.entries()) {
      const file = path.join(imageRoot, rel);
      const buffer = await fs.readFile(file);
      const { width, height } = imageSize(buffer);
      if (!width || !height) throw new Error(`could not measure ${file}`);

      const pathname = `spidernomicon/rune-${pad3(parsed.number)}${k === 0 ? '' : `-${k}`}.jpg`;
      if (dryRun) {
        images.push({ url: `dry-run:${pathname}`, width, height });
        continue;
      }
      const blob = await put(pathname, buffer, {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'image/jpeg',
      });
      uploaded += 1;
      images.push({ url: blob.url, width, height });
      console.log(`uploaded ${pathname} (${width}x${height})`);
    }

    runes.push({ ...parsed, images, tweetId: entry.tweet_id, date: entry.date });
  }

  console.log(`\nparsed ${runes.length}/${entries.length} entries, ${uploaded} images uploaded`);
  for (const rune of runes) {
    if (!rune.meaning) console.warn(`note: rune ${rune.number} '${rune.name}' has no meaning text`);
    if (rune.images.length === 0) console.warn(`note: rune ${rune.number} '${rune.name}' has no image`);
  }
  if (unparsed.length) {
    console.error('\nCOULD NOT PARSE:');
    for (const entry of unparsed) console.error(`  [${entry.pos}] ${entry.tweet_id}: ${JSON.stringify(entry.text)}`);
  }

  if (dryRun) {
    for (const rune of runes) {
      console.log(`${pad3(rune.number)} ${JSON.stringify(rune.name)} :: ${rune.meaning.slice(0, 60).replace(/\n/g, ' ')}`);
    }
    process.exit(unparsed.length ? 1 : 0);
  }

  // Keep whatever scripts/upload-sorceries.ts has already written.
  const existing = await fs.readFile(OUTPUT, 'utf8').catch(() => '');
  const existingSorceries = /\/\/ --- sorceries:.*?\n([\s\S]*?)\/\/ --- end sorceries ---/.exec(existing)?.[1];

  await fs.writeFile(OUTPUT, renderContentFile(runes, existingSorceries), 'utf8');
  console.log(`wrote ${OUTPUT}`);
  process.exit(unparsed.length ? 1 : 0);
}

function renderContentFile(runes: Rune[], sorceriesBlock = 'export const sorceries: Sorcery[] = [];\n'): string {
  const body = runes
    .map((rune) => {
      const images = rune.images
        .map((img) => `      { url: ${JSON.stringify(img.url)}, width: ${img.width}, height: ${img.height} },`)
        .join('\n');
      return [
        '  {',
        `    number: ${rune.number},`,
        `    name: ${JSON.stringify(rune.name)},`,
        `    meaning: ${JSON.stringify(rune.meaning)},`,
        images ? `    images: [\n${images}\n    ],` : '    images: [],',
        `    tweetId: ${JSON.stringify(rune.tweetId)},`,
        `    date: ${JSON.stringify(rune.date)},`,
        '  },',
      ].join('\n');
    })
    .join('\n');

  return `/**
 * THE SPIDERNOMICON — the spiderscript lexicon.
 *
 * 100 Spiderscript runes, posted as a Twitter thread from 8 May to 25 Dec 2022.
 * Generated by scripts/upload-spidernomicon.ts from the archived thread; the
 * text is his, verbatim. Runes 79–82 were posted as videos (the first
 * Sorceries) and have no still image.
 */

export interface RuneImage {
  url: string;
  width: number;
  height: number;
}

export interface Rune {
  number: number;
  /** As he wrote it: lowercase runes, capitalized High Runes, all-caps Divine Runes. */
  name: string;
  meaning: string;
  /** The first image is the rune; any others are variants he posted alongside it. */
  images: RuneImage[];
  tweetId: string;
  /** ISO date of the tweet. */
  date: string;
}

export interface Sorcery {
  title: string;
  /** Video URL (mp4). */
  src: string;
  poster?: string;
  /** His tweet text, verbatim minus the media link. */
  caption: string;
  /** ISO date of the tweet. */
  date: string;
  tweetId: string;
  width: number;
  height: number;
}

export const THREAD_URL = 'https://x.com/s0ulDirect0r/status/1523323511543975937';

export function tweetUrl(tweetId: string): string {
  return \`https://x.com/s0ulDirect0r/status/\${tweetId}\`;
}

/**
 * The Sorceries: short videos from June 2022 to March 2023 animating the runes,
 * in chronological order. The "Sorceries" section on /spidernomicon renders
 * only when this list is non-empty.
 */
// --- sorceries: generated by scripts/upload-sorceries.ts ---
${sorceriesBlock}// --- end sorceries ---

// --- runes: generated by scripts/upload-spidernomicon.ts ---
export const runes: Rune[] = [
${body}
];
// --- end runes ---
`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
