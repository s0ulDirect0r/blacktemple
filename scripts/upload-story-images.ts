/**
 * Upload the illustrations for the short fiction in content/stories/ to
 * Vercel Blob.
 *
 * Every image is stored at `stories/<story-slug>/<name>.jpg` with a stable
 * pathname (no random suffix) so the URLs referenced from the MDX frontmatter
 * never change; re-running the script simply overwrites the same blobs.
 *
 * The script prints a JSON manifest (slug, name, url, width, height) to
 * stdout, which is what the MDX frontmatter was generated from.
 *
 * Usage:
 *   npx tsx scripts/upload-story-images.ts [--dry-run]
 *
 * Reads BLOB_READ_WRITE_TOKEN from .env. The source files are the
 * full-resolution originals in ~/Pictures; they are only read, never modified.
 */

import { put } from '@vercel/blob';
import { imageSize } from 'image-size';
import dotenv from 'dotenv';
import fs from 'fs';
import os from 'os';
import path from 'path';

dotenv.config();

const PICTURES = path.join(os.homedir(), 'Pictures');

interface StoryImages {
  slug: string;
  /** Map of blob name (without extension) -> source file in ~/Pictures. */
  files: Record<string, string>;
}

const STORIES: StoryImages[] = [
  { slug: 'poesis', files: { cover: 'Poesis.jpg' } },
  { slug: 'the-wand-and-the-ship', files: { cover: 'the_dancing_ship_title.jpg' } },
  { slug: 'soulheist-777-part-1', files: { cover: 'soulheist_777_title.jpg' } },
  { slug: 'blood-drunk', files: { cover: 'blood_drunk_title.jpg' } },
  { slug: 'spiders-path', files: { cover: 'spiders_path_title.jpg' } },
  { slug: 'the-abyss', files: { cover: 'the_abyss_title.jpg' } },
  { slug: 'the-first-lesson', files: { cover: 'the_first_lesson_title.jpg' } },
  { slug: 'synner', files: { cover: 'synner_title.jpg' } },
  { slug: 'the-enforcer', files: { cover: 'enforcer_title__card.jpg' } },
  {
    slug: 'whispers-of-the-black-temple',
    files: {
      cover: 'whispers_title_card.jpg',
      'page-0': 'whispers_page_zero.jpg',
      'page-1': 'whispers_page_one.jpg',
      'page-2': 'whispers_page_two.jpg',
      'page-3': 'whispers_page_three.jpg',
      'page-4': 'whispers_page_four.jpg',
      'page-5': 'whispers_page_five.jpg',
      'page-6': 'whisper_page_six.jpg',
      end: 'whispers_end.jpg',
    },
  },
  {
    slug: 'the-wastelands',
    files: {
      '01': 'wasteland_one.jpg',
      '02': 'wasteland_two.jpg',
      '03': 'wasteland_three.jpg',
      '04': 'wasteland_four.jpg',
      '05': 'wasteland_five.jpg',
      '06': 'wasteland_six.jpg',
      '07': 'wasteland_seven.jpg',
      '08': 'wasteland_eight.jpg',
      '09': 'wasteland_nine.jpg',
      '10': 'wasteland_ten.jpg',
      '11': 'wasteland_eleven.jpg',
      '12': 'wasteland_twelve.jpg',
      end: 'wasteland_end.jpg',
    },
  },
];

interface UploadedImage {
  slug: string;
  name: string;
  url: string;
  width: number;
  height: number;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token && !dryRun) {
    console.error('BLOB_READ_WRITE_TOKEN is not set (source .env first).');
    process.exit(1);
  }

  const results: UploadedImage[] = [];

  for (const story of STORIES) {
    for (const [name, file] of Object.entries(story.files)) {
      const source = path.join(PICTURES, file);
      const body = fs.readFileSync(source);
      const { width, height } = imageSize(body);
      if (!width || !height) {
        throw new Error(`Could not read dimensions of ${source}`);
      }

      const pathname = `stories/${story.slug}/${name}.jpg`;
      let url = `(dry run) ${pathname}`;

      if (!dryRun) {
        const blob = await put(pathname, body, {
          access: 'public',
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: 'image/jpeg',
          token,
        });
        url = blob.url;
      }

      console.error(`${pathname}  ${width}x${height}  <- ${file}`);
      results.push({ slug: story.slug, name, url, width, height });
    }
  }

  console.log(JSON.stringify(results, null, 2));
  console.error(`\n${results.length} images ${dryRun ? 'measured' : 'uploaded'}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
