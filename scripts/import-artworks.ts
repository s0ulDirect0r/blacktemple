/**
 * Curated bulk import of rendered artwork into the gallery.
 *
 * Input: a directory produced by procreate2img.py (one <name>.jpg + <name>.json per piece)
 * and a selection file listing which pieces to import (one JSON basename per line, or "*").
 *
 *   npm run import-artworks -- --dir /path/to/renders --select /path/to/selection.txt [--project 4] [--dry-run] [--max-side 4096]
 *
 * For each selected piece: resizes to --max-side (default 4096) as JPEG q90 with the
 * embedded colour profile kept, uploads to Vercel Blob, and inserts an artworks row with
 * width/height/source_meta. Skips pieces whose title already exists (case-insensitive)
 * unless --force is passed. Safe to re-run.
 */
import { neon } from '@neondatabase/serverless';
import { put } from '@vercel/blob';
import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

interface RenderMeta {
  name: string;
  author?: string | null;
  canvas: [number, number];
  output_size: [number, number];
  layers?: number;
  strokes?: number | null;
  tracked_seconds?: number | null;
  dpi?: number | null;
  color_profile?: string | null;
  modified?: string;
  jpg: string;
  png: string;
  source?: string;
}

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : 'true';
}

async function main() {
  const dir = arg('dir');
  const selectPath = arg('select');
  if (!dir || !selectPath) {
    console.error('usage: --dir <renders> --select <selection.txt|*> [--project id] [--dry-run] [--force] [--max-side N]');
    process.exit(1);
  }
  const project = arg('project') ?? null;
  const dryRun = arg('dry-run') === 'true';
  const force = arg('force') === 'true';
  const maxSide = Number(arg('max-side', '4096'));

  const all = (await fs.readdir(dir)).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
  let selected: string[];
  if (selectPath === '*') {
    selected = all;
  } else {
    const lines = (await fs.readFile(selectPath, 'utf8'))
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
    selected = lines.map((l) => (l.endsWith('.json') ? l : `${l}.json`));
    const missing = selected.filter((s) => !all.includes(s));
    if (missing.length) {
      console.error('Selection entries not found in renders dir:\n  ' + missing.join('\n  '));
      process.exit(1);
    }
  }
  console.log(`${selected.length} piece(s) selected of ${all.length} rendered${dryRun ? ' (dry run)' : ''}`);

  const existing = (await sql`SELECT lower(title) AS t FROM artworks`) as Array<{ t: string }>;
  const titles = new Set(existing.map((r) => r.t));

  let imported = 0;
  let skipped = 0;
  for (const jsonName of selected) {
    const meta = JSON.parse(await fs.readFile(path.join(dir, jsonName), 'utf8')) as RenderMeta;
    const title = meta.name.trim();
    if (!force && titles.has(title.toLowerCase())) {
      console.log(`skip (exists): ${title}`);
      skipped++;
      continue;
    }

    const src = path.isAbsolute(meta.jpg) ? meta.jpg : path.join(dir, path.basename(meta.jpg));
    const image = sharp(src, { failOn: 'none' }).keepIccProfile().rotate();
    const info = await image.metadata();
    const w = info.width ?? meta.output_size[0];
    const h = info.height ?? meta.output_size[1];
    const scale = Math.min(1, maxSide / Math.max(w, h));
    const outW = Math.round(w * scale);
    const outH = Math.round(h * scale);
    const buffer = await (scale < 1 ? image.resize(outW, outH, { fit: 'inside' }) : image)
      .jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: '4:4:4' })
      .toBuffer();

    const created = meta.modified ? new Date(meta.modified) : new Date();
    const safeName = title.replace(/[^\w\-. ]+/g, '_').replace(/\s+/g, '_');
    const sourceMeta = {
      source: 'procreate',
      source_file: meta.source ? path.basename(meta.source) : undefined,
      canvas: meta.canvas,
      layers: meta.layers,
      strokes: meta.strokes,
      tracked_seconds: meta.tracked_seconds,
      dpi: meta.dpi,
      color_profile: meta.color_profile,
      author: meta.author,
    };

    if (dryRun) {
      console.log(`would import: ${title}  ${outW}x${outH}  ${(buffer.length / 1e6).toFixed(1)} MB  created ${created.toISOString().slice(0, 10)}`);
      imported++;
      continue;
    }

    const blob = await put(`art/${safeName}.jpg`, buffer, {
      access: 'public',
      contentType: 'image/jpeg',
      addRandomSuffix: true,
      token: process.env.BLOB_READ_WRITE_TOKEN!,
    });

    await sql`
      INSERT INTO artworks (url, title, description, project_id, tags, width, height, source_meta, created_at, updated_at)
      VALUES (${blob.url}, ${title}, ${null}, ${project}, ${[]}, ${outW}, ${outH}, ${JSON.stringify(sourceMeta)}::jsonb, ${created.toISOString()}, ${new Date().toISOString()})
    `;
    titles.add(title.toLowerCase());
    imported++;
    console.log(`imported: ${title}  ${outW}x${outH}  -> ${blob.url}`);
  }
  console.log(`done: ${imported} imported, ${skipped} skipped`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
