/**
 * Backfill artworks.width / artworks.height for rows that were inserted before
 * migration 005 added the columns. Fetches each blob, measures it with
 * image-size, and updates the row. Safe to re-run: only rows with NULL
 * width or height are touched.
 *
 *   npm run backfill-dimensions
 */
import { neon } from '@neondatabase/serverless';
import { imageSize } from 'image-size';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const sql = neon(process.env.DATABASE_URL);
const CONCURRENCY = 4;

interface Row {
  id: string;
  url: string;
}

async function measure(url: string): Promise<{ width: number; height: number }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const size = imageSize(bytes);
  if (!size.width || !size.height) {
    throw new Error('image-size returned no dimensions');
  }
  return { width: size.width, height: size.height };
}

async function run() {
  const rows = (await sql`
    SELECT id, url
    FROM artworks
    WHERE width IS NULL OR height IS NULL
    ORDER BY created_at DESC
  `) as Row[];

  const totalRows = (await sql`SELECT COUNT(*)::int AS count FROM artworks`) as Array<{ count: number }>;
  console.log(`${rows.length} of ${totalRows[0].count} artworks are missing dimensions`);

  let updated = 0;
  let failed = 0;
  let cursor = 0;

  const worker = async () => {
    while (cursor < rows.length) {
      const row = rows[cursor++];
      try {
        const { width, height } = await measure(row.url);
        await sql`UPDATE artworks SET width = ${width}, height = ${height} WHERE id = ${row.id}`;
        updated += 1;
        console.log(`  ok   ${row.id}  ${width}x${height}`);
      } catch (error) {
        failed += 1;
        console.warn(`  fail ${row.id}  ${row.url}  ${(error as Error).message}`);
      }
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(`\nUpdated ${updated} row(s), ${failed} failed`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
