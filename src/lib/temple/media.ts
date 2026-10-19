import { createHash } from 'node:crypto';
import sharp, { type Metadata } from 'sharp';
import { filename, invalid, MAX_IMAGE_BYTES, text } from './validation';

export async function inspectImage(bytes: Buffer, name: string, alt: unknown) {
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) invalid('Each image must be no larger than 8 MiB.');
  let meta: Metadata;
  try {
    const image = sharp(bytes, { limitInputPixels: 24_000_000, failOn: 'warning' });
    meta = await image.metadata();
    if (!['png', 'jpeg', 'webp'].includes(meta.format ?? '') || (meta.pages ?? 1) > 1) invalid('Use a still PNG, JPEG or WebP image.');
    // Decode the full image as well as its header; retain the original bytes for export.
    await image.stats();
  } catch { return invalid('This image could not be read. Use a still PNG, JPEG or WebP image.'); }
  if (!meta.width || !meta.height) invalid('The image has no usable dimensions.');
  return { filename: filename(name), alt: text(alt, 1, 500, 'Image description'), mime: `image/${meta.format === 'jpeg' ? 'jpeg' : meta.format}`, width: meta.width, height: meta.height, sha256: createHash('sha256').update(bytes).digest('hex') };
}
