import { cache } from 'react';
import { imageSize } from 'image-size';
import { getArtworkById, getGalleryImages } from '@/lib/gallery';
import { portfolio, type PortfolioVideo } from '@/content/portfolio';
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
  createdAt?: string;
  href?: string;
  video?: PortfolioVideo;
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

/**
 * Hero + gallery paintings with measured native dimensions.
 * Deduped per request with React cache so metadata and the page share one fetch.
 * Never throws: a database or network failure renders the page without paintings.
 */
export const getPortfolioArt = cache(async (): Promise<PortfolioArt> => {
  const uploads: PortfolioPainting[] = portfolio.additionalArt.map((painting) => ({
    ...painting,
    href: painting.url,
  }));
  try {
    const images = portfolio.selectedArt.length
      ? (await Promise.all(portfolio.selectedArt.map(getArtworkById)))
          .filter((image): image is ArtworkImage => image !== null)
      : (await getGalleryImages({ limit: PORTFOLIO_GALLERY_SIZE + 1 })).images;
    const selected = await Promise.all(images.map(toPainting));
    const works = [...uploads, ...selected];
    const animations = works.filter((painting) => painting.video);
    const stills = works.filter((painting) => !painting.video);
    // Space animations through the sequence so CSS columns each receive a mix.
    const all: PortfolioPainting[] = [];
    let animationIndex = 0;
    for (let i = 0; i < stills.length; i++) {
      all.push(stills[i]);
      const target = Math.floor(((i + 1) * animations.length) / stills.length);
      while (animationIndex < target) {
        all.push(animations[animationIndex++]);
      }
    }
    if (!stills.length) all.push(...animations);
    const anchors = ['9', '8', '7'].map((id) => all.find((painting) => String(painting.id) === id));
    const ordered = all.filter((painting) => !['9', '8', '7'].includes(String(painting.id)));
    // DOPENESS opens the selection, GRACE punctuates it, and CHAOS closes it.
    if (anchors[0]) ordered.unshift(anchors[0]);
    if (anchors[1]) ordered.splice(Math.ceil(ordered.length / 2), 0, anchors[1]);
    if (anchors[2]) ordered.push(anchors[2]);
    const primalIndex = ordered.findIndex((painting) => String(painting.id) === '5');
    if (primalIndex >= 0) {
      const [primal] = ordered.splice(primalIndex, 1);
      ordered.splice(anchors[0] ? 1 : 0, 0, primal);
    }
    const [hero = null, ...rest] = ordered;
    return { hero, paintings: rest };
  } catch (error) {
    console.error('[portfolio] could not load artwork', error);
    const [hero = null, ...rest] = uploads;
    return { hero, paintings: rest };
  }
});
