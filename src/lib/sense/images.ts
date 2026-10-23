import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { get, put } from '@vercel/blob';
import { imageSize } from 'image-size';
import { membershipDatabase } from '@/lib/membership/database';
import { MemberError } from '@/lib/membership/errors';

/** Vercel caps request bodies at 4.5 MB. */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };

/**
 * Images live in a private Blob store (SENSE_BLOB_READ_WRITE_TOKEN), separate
 * from the public gallery store. Outside production, a local folder stands in.
 */
function storage() {
  const token = process.env.SENSE_BLOB_READ_WRITE_TOKEN;
  if (token) return { kind: 'blob' as const, token };
  if (process.env.VERCEL_ENV === 'production') throw new MemberError(503, 'Image storage isn’t set up yet.');
  return { kind: 'local' as const, dir: process.env.SENSE_LOCAL_IMAGE_DIR || join(/*turbopackIgnore: true*/ tmpdir(), 'blacktemple-sense-images') };
}

export async function saveImage(bytes: Buffer) {
  if (bytes.length === 0) throw new MemberError(400, 'That image is empty.');
  if (bytes.length > MAX_IMAGE_BYTES) throw new MemberError(413, 'Images can be up to 4 MB.');
  let size: ReturnType<typeof imageSize>;
  try { size = imageSize(bytes); } catch { throw new MemberError(415, 'Paste a PNG, JPEG, WebP or GIF.'); }
  const contentType = size.type ? TYPES[size.type] : undefined;
  if (!contentType) throw new MemberError(415, 'Paste a PNG, JPEG, WebP or GIF.');

  const id = randomUUID();
  const key = `sense/${id}.${size.type}`;
  const store = storage();
  if (store.kind === 'blob') {
    await put(key, bytes, { access: 'private', token: store.token, contentType, addRandomSuffix: false });
  } else {
    // Development only; the ignore hints keep the bundler from tracing the whole project.
    await mkdir(join(/*turbopackIgnore: true*/ store.dir, 'sense'), { recursive: true });
    await writeFile(join(/*turbopackIgnore: true*/ store.dir, key), bytes, { mode: 0o600 });
  }
  await membershipDatabase().query(
    'INSERT INTO sense_images (id, storage_key, content_type, bytes, width, height) VALUES ($1, $2, $3, $4, $5, $6)',
    [id, key, contentType, bytes.length, size.width ?? null, size.height ?? null],
  );
  return { id, url: `/api/sense/images/${id}`, width: size.width ?? null, height: size.height ?? null };
}

export async function loadImage(id: string): Promise<{ body: ReadableStream<Uint8Array> | Buffer; contentType: string } | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { rows } = await membershipDatabase().query<{ storage_key: string; content_type: string }>(
    'SELECT storage_key, content_type FROM sense_images WHERE id = $1', [id]);
  if (!rows[0]) return null;
  const store = storage();
  if (store.kind === 'blob') {
    const result = await get(rows[0].storage_key, { access: 'private', token: store.token });
    if (!result || result.statusCode !== 200) return null;
    return { body: result.stream, contentType: rows[0].content_type };
  }
  try {
    return { body: await readFile(join(/*turbopackIgnore: true*/ store.dir, rows[0].storage_key)), contentType: rows[0].content_type };
  } catch {
    return null;
  }
}

/** Every stored image, for export. */
export async function allImages() {
  const { rows } = await membershipDatabase().query<{ id: string; storage_key: string }>('SELECT id, storage_key FROM sense_images ORDER BY created_at');
  return rows;
}
