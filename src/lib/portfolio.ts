import { cache } from 'react';
import { imageSize } from 'image-size';
import { getGalleryImages } from '@/lib/gallery';
import { portfolio } from '@/content/portfolio';
import type { ArtworkImage } from '@/types/artwork';

/** Number of paintings shown in the masonry (the hero is taken separately). */
export const PORTFOLIO_GALLERY_SIZE = 16;

export interface PortfolioPainting {
  id: string;
  title: string;
  description?: string;
  url: string;
  width: number;
  height: number;
  createdAt: string;
}

export interface PortfolioArt {
  hero: PortfolioPainting | null;
  paintings: PortfolioPainting[];
}

interface Dimensions {
  width: number;
  height: number;
}

/** Most of the paintings are square iPad canvases; used when measuring fails. */
const FALLBACK_DIMENSIONS: Dimensions = { width: 4000, height: 4000 };

/** Bytes fetched to read image headers. Enough for JPEG/PNG/WebP/GIF metadata. */
const HEADER_BYTES = 131072;

/** Module-level cache so a warm server never re-measures a URL. */
const dimensionCache = new Map<string, Promise<Dimensions>>();

function parseDimensions(bytes: Uint8Array): Dimensions | null {
  try {
    const { width, height, orientation } = imageSize(bytes);
    if (!width || !height) return null;
    // EXIF orientations 5-8 are rotated 90 degrees.
    const rotated = typeof orientation === 'number' && orientation >= 5;
    return rotated ? { width: height, height: width } : { width, height };
  } catch {
    return null;
  }
}

async function fetchBytes(url: string, range: boolean): Promise<Uint8Array> {
  const res = await fetch(url, {
    headers: range ? { Range: `bytes=0-${HEADER_BYTES - 1}` } : undefined,
  });
  if (!res.ok) throw new Error(`Image fetch failed (${res.status}) for ${url}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function measure(url: string): Promise<Dimensions> {
  // Header-only range request first; fall back to the full file if the
  // metadata happens to sit past the first chunk.
  const fromHeader = parseDimensions(await fetchBytes(url, true));
  if (fromHeader) return fromHeader;
  const fromFull = parseDimensions(await fetchBytes(url, false));
  return fromFull ?? FALLBACK_DIMENSIONS;
}

export function getImageDimensions(url: string): Promise<Dimensions> {
  let pending = dimensionCache.get(url);
  if (!pending) {
    pending = measure(url).catch((error) => {
      console.error('[portfolio] could not measure image', url, error);
      dimensionCache.delete(url);
      return FALLBACK_DIMENSIONS;
    });
    dimensionCache.set(url, pending);
  }
  return pending;
}

async function toPainting(image: ArtworkImage): Promise<PortfolioPainting> {
  const { width, height } = await getImageDimensions(image.url);
  return {
    id: image.id,
    title: image.metadata.title,
    description: image.metadata.description,
    url: image.url,
    width,
    height,
    createdAt: image.metadata.created_at,
  };
}

function selectImages(images: ArtworkImage[]): ArtworkImage[] {
  const wanted = PORTFOLIO_GALLERY_SIZE + 1; // hero + gallery
  if (portfolio.selectedArt.length === 0) return images.slice(0, wanted);

  const byId = new Map(images.map((image) => [String(image.id), image]));
  const picked = portfolio.selectedArt
    .map((id) => byId.get(String(id)))
    .filter((image): image is ArtworkImage => Boolean(image));

  // Top up with the newest pieces not already selected.
  const seen = new Set(picked.map((image) => String(image.id)));
  for (const image of images) {
    if (picked.length >= wanted) break;
    if (!seen.has(String(image.id))) picked.push(image);
  }
  return picked.slice(0, wanted);
}

/**
 * Hero + gallery paintings with measured native dimensions.
 * Deduped per request with React cache so metadata and the page share one fetch.
 * Never throws: a database or network failure renders the page without paintings.
 */
export const getPortfolioArt = cache(async (): Promise<PortfolioArt> => {
  try {
    const { images } = await getGalleryImages({ limit: 60 });
    const selected = selectImages(images);
    const paintings = await Promise.all(selected.map(toPainting));
    const [hero = null, ...rest] = paintings;
    return { hero, paintings: rest };
  } catch (error) {
    console.error('[portfolio] could not load artwork', error);
    return { hero: null, paintings: [] };
  }
});
