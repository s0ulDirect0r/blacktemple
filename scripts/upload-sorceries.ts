/**
 * Upload the Sorcery videos (animated runes, June 2022 – March 2023) to Vercel
 * Blob and fill the `sorceries` block of src/content/spidernomicon.ts.
 *
 *   npx tsx scripts/upload-sorceries.ts --videos /path/to/tweets/videos --tweets /path/to/all_tweets.json [--dry-run]
 *
 * Videos are named <date>_<tweet_id>.mp4. Only the tweet ids listed in
 * SORCERIES below are used; their captions come from the tweet archive. Each
 * video is uploaded as spidernomicon/sorceries/<date>-<slug>.mp4 with a poster
 * (the frame at 1s, via ffmpeg) as the same basename .jpg.
 */
import { put } from '@vercel/blob';
import dotenv from 'dotenv';
import { execFileSync } from 'child_process';
import { promises as fs } from 'fs';
import { imageSize } from 'image-size';
import os from 'os';
import path from 'path';

dotenv.config();

/** Chronological. Titles are curated; captions are the tweets themselves. */
const SORCERIES: { tweetId: string; title: string }[] = [
  { tweetId: '1535826646908841984', title: 'Spell of the Sorcerer' },
  { tweetId: '1540741377834659841', title: 'Sorcery #0: The Sorcery of Binding Limits' },
  { tweetId: '1541492366548148226', title: 'Sorcery #1: The Sorcery of Focused Essence' },
  { tweetId: '1545472928002850817', title: 'Sorcery #2: The Sorcery of Creative Emergence' },
  { tweetId: '1546468164636139522', title: 'Sorcery #3: The Invitation of Allness' },
  { tweetId: '1547717147450695680', title: 'Sorcery #4: The Mystery of Ensoulment' },
  { tweetId: '1556630346648719360', title: 'Sorcery #5: The Heart of God' },
  { tweetId: '1557633475653640192', title: 'Spiderscript (animated)' },
  { tweetId: '1559096365094952961', title: 'The Sorcerer' },
  { tweetId: '1568093602273804289', title: 'Spell: good vibes' },
  { tweetId: '1569231012718329856', title: 'Spell: eros' },
  { tweetId: '1569543685913681924', title: 'Spell: alignment' },
  { tweetId: '1570070162736353281', title: 'Spell: happiness' },
  { tweetId: '1571054330530369537', title: 'Spell: unfolding' },
  { tweetId: '1572094364943536128', title: 'Spell: creation' },
  { tweetId: '1572265864132534275', title: 'Spell: the anomaly' },
  { tweetId: '1574048391096680450', title: 'Spell: transformation' },
  { tweetId: '1618105994063810560', title: 'A Daily Sigil' },
  { tweetId: '1625227101166260224', title: 'Flowing Desires' },
  { tweetId: '1628501105280970752', title: 'Golden Soul' },
  { tweetId: '1629911537711452160', title: 'Adventure & Connection' },
  { tweetId: '1635826100554338304', title: 'Hope' },
];

const OUTPUT = path.join(process.cwd(), 'src', 'content', 'spidernomicon.ts');

interface ArchivedTweet {
  tweet_id: string;
  created_at: string;
  full_text: string;
}

interface Sorcery {
  title: string;
  src: string;
  poster: string;
  caption: string;
  date: string;
  tweetId: string;
  width: number;
  height: number;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : 'true';
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Tweet text as he wrote it, minus the t.co media link, leading @mentions and HTML entities. */
function cleanCaption(text: string): string {
  return text
    .replace(/^(?:@\w+\s+)+/, '')
    .replace(/\s*https?:\/\/t\.co\/\w+\s*$/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function probe(file: string): { width: number; height: number } {
  const out = execFileSync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file,
  ]).toString().trim();
  const [width, height] = out.split(',').map(Number);
  return { width, height };
}

async function makePoster(video: string, out: string): Promise<Buffer> {
  // Frame at 1s; fall back to the first frame for clips shorter than that.
  for (const seek of ['1', '0']) {
    try {
      execFileSync(
        'ffmpeg',
        ['-y', '-v', 'error', '-ss', seek, '-i', video, '-frames:v', '1', '-update', '1', '-pix_fmt', 'yuvj420p', '-q:v', '3', out],
        { stdio: ['ignore', 'ignore', 'pipe'] }
      );
      return await fs.readFile(out);
    } catch {
      // try the next seek
    }
  }
  throw new Error(`could not extract a poster from ${video}`);
}

async function main() {
  const videosDir = arg('videos');
  const tweetsPath = arg('tweets');
  if (!videosDir || !tweetsPath) {
    console.error('usage: --videos <dir> --tweets <all_tweets.json> [--dry-run]');
    process.exit(1);
  }
  const dryRun = arg('dry-run') === 'true';

  const archive: ArchivedTweet[] = JSON.parse(await fs.readFile(tweetsPath, 'utf8'));
  const byId = new Map(archive.map((t) => [t.tweet_id, t]));
  const files = await fs.readdir(videosDir);
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'sorceries-'));

  const sorceries: Sorcery[] = [];
  let uploaded = 0;

  for (const { tweetId, title } of SORCERIES) {
    const file = files.find((f) => f.endsWith(`_${tweetId}.mp4`));
    if (!file) throw new Error(`no video for ${tweetId} (${title})`);
    const tweet = byId.get(tweetId);
    if (!tweet) throw new Error(`no tweet ${tweetId} in archive`);

    const date = file.slice(0, 10);
    const base = `spidernomicon/sorceries/${date}-${slugify(title)}`;
    const videoPath = path.join(videosDir, file);
    const { width, height } = probe(videoPath);
    const posterBuffer = await makePoster(videoPath, path.join(tmp, `${tweetId}.jpg`));
    const posterSize = imageSize(posterBuffer);

    let src = `dry-run:${base}.mp4`;
    let poster = `dry-run:${base}.jpg`;
    if (!dryRun) {
      const video = await put(`${base}.mp4`, await fs.readFile(videoPath), {
        access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'video/mp4',
      });
      const still = await put(`${base}.jpg`, posterBuffer, {
        access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'image/jpeg',
      });
      src = video.url;
      poster = still.url;
      uploaded += 2;
    }
    console.log(`${dryRun ? 'would upload' : 'uploaded'} ${base}.mp4 (${width}x${height}) + poster (${posterSize.width}x${posterSize.height})`);

    sorceries.push({ title, src, poster, caption: cleanCaption(tweet.full_text), date, tweetId, width, height });
  }

  await fs.rm(tmp, { recursive: true, force: true });
  console.log(`\n${sorceries.length} sorceries, ${uploaded} files uploaded`);

  if (dryRun) {
    for (const s of sorceries) console.log(`${s.date} ${s.title} :: ${s.caption.slice(0, 70).replace(/\n/g, ' ')}`);
    return;
  }

  const existing = await fs.readFile(OUTPUT, 'utf8');
  const marker = /(\/\/ --- sorceries:.*?\n)[\s\S]*?(\/\/ --- end sorceries ---)/;
  if (!marker.test(existing)) throw new Error(`${OUTPUT} has no sorceries block; run scripts/upload-spidernomicon.ts first`);
  const block = `export const sorceries: Sorcery[] = [\n${sorceries.map(renderSorcery).join('\n')}\n];\n`;
  await fs.writeFile(OUTPUT, existing.replace(marker, `$1${block}$2`), 'utf8');
  console.log(`wrote ${OUTPUT}`);
}

function renderSorcery(s: Sorcery): string {
  return [
    '  {',
    `    title: ${JSON.stringify(s.title)},`,
    `    src: ${JSON.stringify(s.src)},`,
    `    poster: ${JSON.stringify(s.poster)},`,
    `    caption: ${JSON.stringify(s.caption)},`,
    `    date: ${JSON.stringify(s.date)},`,
    `    tweetId: ${JSON.stringify(s.tweetId)},`,
    `    width: ${s.width},`,
    `    height: ${s.height},`,
    '  },',
  ].join('\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
