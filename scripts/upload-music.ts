/**
 * Uploads the original music tracks to Vercel Blob and prints their public URLs.
 *
 *   npx tsx scripts/upload-music.ts --dir /path/to/m4a/files
 *
 * Each file lands at music/<slug>.m4a. Uploads use a fixed pathname with
 * overwrite allowed, so the script is safe to re-run: the URLs stay stable.
 * Paste the printed URLs into src/content/music.ts.
 */
import { put } from '@vercel/blob';
import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';

dotenv.config();

/** Source filename -> blob slug, in display order. */
const TRACKS: { file: string; slug: string }[] = [
  { file: 'find the way.m4a', slug: 'find-the-way' },
  { file: 'synthtrap one.m4a', slug: 'synthtrap-one' },
  { file: 'voidsong.m4a', slug: 'voidsong' },
  { file: 'voice and chill.m4a', slug: 'voice-and-chill' },
  { file: 'Dopeness.m4a', slug: 'dopeness' },
  { file: 'bass song.m4a', slug: 'bass-song' },
];

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN is not set');

  const dir = argValue('--dir') ?? process.cwd();

  for (const { file, slug } of TRACKS) {
    const body = await fs.readFile(path.join(dir, file));
    const blob = await put(`music/${slug}.m4a`, body, {
      access: 'public',
      contentType: 'audio/mp4',
      addRandomSuffix: false,
      allowOverwrite: true,
      token,
    });
    console.log(`${slug}\t${(body.length / 1024 / 1024).toFixed(2)} MB\t${blob.url}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
