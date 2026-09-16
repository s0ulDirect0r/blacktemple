// Shared building blocks for the Open Graph images rendered with next/og.
//
// Satori (the renderer behind ImageResponse) only supports a subset of CSS:
// every element with more than one child needs `display: flex`, and images
// must be absolute URLs or data URIs. Everything here sticks to that subset.

import { readFile } from 'fs/promises';
import { join } from 'path';
import { ImageResponse } from 'next/og';
import type { ReactElement, ReactNode } from 'react';
import { SITE_TITLE } from '@/lib/site';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

export const PIXEL_FONT = 'Press Start 2P';
export const SANS_FONT = 'Geist';

const COLORS = {
  bg: '#000000',
  fg: '#ffffff',
  muted: '#a1a1aa', // zinc-400
  faint: '#71717a', // zinc-500
  border: '#27272a', // zinc-800
  panel: '#18181b', // zinc-900
};

type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 600;
  style: 'normal';
};

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

async function readLocalFont(path: string): Promise<ArrayBuffer | null> {
  try {
    return toArrayBuffer(await readFile(path));
  } catch {
    return null;
  }
}

// Last-resort fallback: pull a TTF straight from Google Fonts. Requesting the
// CSS without a browser user agent makes Google return truetype URLs.
async function fetchGoogleFont(family: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`;
    const css = await fetch(cssUrl, {
      headers: { 'User-Agent': '' },
      signal: AbortSignal.timeout(5000),
    }).then((r) => (r.ok ? r.text() : ''));
    const match = css.match(/src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype)'\)/);
    if (!match) return null;
    const res = await fetch(match[1], { signal: AbortSignal.timeout(5000) });
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

let fontCache: Promise<OgFont[]> | null = null;

/**
 * Load the pixel display font and the sans body font. Local TTFs bundled under
 * src/app/fonts are preferred; Google Fonts is the fallback. If nothing can be
 * loaded the caller omits `fonts` and next/og falls back to its built-in sans.
 */
export function loadOgFonts(): Promise<OgFont[]> {
  if (!fontCache) {
    fontCache = (async () => {
      // Literal `join(process.cwd(), ...)` calls so Next's output file tracing
      // includes the TTFs in the serverless bundle.
      const [pixel, sans, sansBold] = await Promise.all([
        readLocalFont(join(process.cwd(), 'src/app/fonts/PressStart2P-Regular.ttf')).then(
          (d) => d ?? fetchGoogleFont('Press Start 2P', 400)
        ),
        readLocalFont(join(process.cwd(), 'src/app/fonts/Geist-Regular.ttf')).then(
          (d) => d ?? fetchGoogleFont('Geist', 400)
        ),
        readLocalFont(join(process.cwd(), 'src/app/fonts/Geist-SemiBold.ttf')).then(
          (d) => d ?? fetchGoogleFont('Geist', 600)
        ),
      ]);

      const fonts: OgFont[] = [];
      if (pixel) fonts.push({ name: PIXEL_FONT, data: pixel, weight: 400, style: 'normal' });
      if (sans) fonts.push({ name: SANS_FONT, data: sans, weight: 400, style: 'normal' });
      if (sansBold) fonts.push({ name: SANS_FONT, data: sansBold, weight: 600, style: 'normal' });
      return fonts;
    })().catch(() => []);
  }
  return fontCache;
}

/** Build the PNG response for a composed OG scene. */
export async function ogImage(node: ReactElement): Promise<ImageResponse> {
  const fonts = await loadOgFonts();
  return new ImageResponse(node, {
    ...OG_SIZE,
    ...(fonts.length > 0 ? { fonts } : {}),
  });
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

/**
 * Download a remote image and shrink it with sharp into a small JPEG data URI.
 * Gallery originals can be tens of megabytes; resizing first keeps Satori fast
 * and the generated PNG well within function limits.
 */
export async function fetchImageData(
  url: string,
  {
    width,
    height,
    fit = 'cover',
    timeoutMs = 15000,
  }: { width: number; height: number; fit?: 'cover' | 'inside'; timeoutMs?: number }
): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    const input = Buffer.from(await res.arrayBuffer());
    const sharp = (await import('sharp')).default;
    const output = await sharp(input)
      .rotate()
      .resize(width, height, { fit, withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();
    return `data:image/jpeg;base64,${output.toString('base64')}`;
  } catch (error) {
    console.error(`[og] failed to prepare image ${url}:`, error);
    return null;
  }
}

/** Resolve up to `count` thumbnails, dropping any that fail. */
export async function fetchThumbnails(urls: string[], count: number, cell: number): Promise<string[]> {
  const results = await Promise.all(
    urls.slice(0, count).map((url) => fetchImageData(url, { width: cell * 2, height: cell * 2 }))
  );
  return results.filter((src): src is string => Boolean(src));
}

// ---------------------------------------------------------------------------
// Scene pieces
// ---------------------------------------------------------------------------

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Deterministic pixel-star speckle, echoing the site's 3D starfield. */
function Stars({ seed = 7, count = 160 }: { seed?: number; count?: number }) {
  const rand = seededRandom(seed);
  const stars = Array.from({ length: count }, (_, i) => {
    const x = Math.floor(rand() * OG_SIZE.width);
    const y = Math.floor(rand() * OG_SIZE.height);
    const size = rand() < 0.82 ? 2 : 3;
    const opacity = 0.18 + rand() * 0.55;
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: size,
          height: size,
          backgroundColor: COLORS.fg,
          opacity,
        }}
      />
    );
  });
  return <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex' }}>{stars}</div>;
}

/**
 * Black canvas with star speckle, a thin frame and the domain stamped in the
 * corner. `children` is laid out inside the frame's padding.
 */
export function OgFrame({
  children,
  seed,
  align = 'center',
}: {
  children: ReactNode;
  seed?: number;
  align?: 'center' | 'flex-start';
}) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        backgroundColor: COLORS.bg,
        color: COLORS.fg,
        fontFamily: SANS_FONT,
        overflow: 'hidden',
      }}
    >
      <Stars seed={seed} />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage:
            'radial-gradient(circle at 50% 45%, rgba(255,255,255,0.07) 0%, rgba(0,0,0,0) 65%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 28,
          left: 28,
          right: 28,
          bottom: 28,
          border: `2px solid ${COLORS.border}`,
        }}
      />
      <div
        style={{
          display: 'flex',
          flex: 1,
          alignItems: align,
          padding: '72px 80px 96px 80px',
        }}
      >
        {children}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 80,
          bottom: 50,
          display: 'flex',
          alignItems: 'center',
          fontFamily: PIXEL_FONT,
          fontSize: 14,
          color: COLORS.faint,
          letterSpacing: 1,
        }}
      >
        BLACKTEMPLE.DEV
      </div>
    </div>
  );
}

/** Small kicker line, e.g. the author name above a page title. */
export function Kicker({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        fontFamily: PIXEL_FONT,
        fontSize: 16,
        color: COLORS.faint,
        letterSpacing: 1,
        marginBottom: 28,
      }}
    >
      {children}
    </div>
  );
}

export function PixelTitle({ children, size = 56 }: { children: ReactNode; size?: number }) {
  return (
    <div
      style={{
        display: 'flex',
        fontFamily: PIXEL_FONT,
        fontSize: size,
        lineHeight: 1.35,
        color: COLORS.fg,
      }}
    >
      {children}
    </div>
  );
}

export function Subtitle({ children, size = 26 }: { children: ReactNode; size?: number }) {
  return (
    <div
      style={{
        display: 'flex',
        fontFamily: SANS_FONT,
        fontSize: size,
        lineHeight: 1.45,
        color: COLORS.muted,
        marginTop: 24,
        maxWidth: 860,
      }}
    >
      {children}
    </div>
  );
}

/** 3x2 grid of square thumbnails; empty cells are drawn as dark panels. */
export function Mosaic({ thumbs, cell = 150, gap = 10 }: { thumbs: string[]; cell?: number; gap?: number }) {
  const cells = Array.from({ length: 6 }, (_, i) => thumbs[i] ?? null);
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        width: cell * 3 + gap * 2,
        height: cell * 2 + gap,
        gap,
        flexShrink: 0,
      }}
    >
      {cells.map((src, i) =>
        src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={src}
            width={cell}
            height={cell}
            alt=""
            style={{ width: cell, height: cell, objectFit: 'cover', borderRadius: 4 }}
          />
        ) : (
          <div
            key={i}
            style={{
              width: cell,
              height: cell,
              backgroundColor: COLORS.panel,
              border: `2px solid ${COLORS.border}`,
              borderRadius: 4,
            }}
          />
        )
      )}
    </div>
  );
}

/**
 * A plain typographic card. Used for Writing/Resume/About and as the fallback
 * for every image route when its data source is unavailable.
 */
export function TypographicOg({
  title,
  subtitle,
  kicker = SITE_TITLE,
  titleSize,
  seed,
}: {
  title: string;
  subtitle?: string;
  kicker?: string | null;
  titleSize?: number;
  seed?: number;
}) {
  return (
    <OgFrame seed={seed}>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {kicker ? <Kicker>{kicker}</Kicker> : null}
        <PixelTitle size={titleSize}>{title}</PixelTitle>
        {subtitle ? <Subtitle>{subtitle}</Subtitle> : null}
      </div>
    </OgFrame>
  );
}

export const ogColors = COLORS;
