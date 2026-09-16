import { getGalleryImages } from '@/lib/gallery';
import {
  Mosaic,
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgFrame,
  PIXEL_FONT,
  PixelTitle,
  SANS_FONT,
  TypographicOg,
  fetchThumbnails,
  ogColors,
  ogImage,
} from '@/lib/og';
import { SITE_TAGLINE, SITE_TITLE } from '@/lib/site';

export const alt = `${SITE_TITLE} — ${SITE_TAGLINE}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
// Regenerated hourly in the background; crawlers always get the cached PNG.
export const revalidate = 3600;

const CELL = 150;

async function recentThumbnails(): Promise<string[]> {
  try {
    const { images } = await getGalleryImages({ limit: 6 });
    return await fetchThumbnails(
      images.map((image) => image.url),
      6,
      CELL
    );
  } catch (error) {
    console.error('[og] home: could not load gallery images:', error);
    return [];
  }
}

export default async function Image() {
  const thumbs = await recentThumbnails();

  if (thumbs.length === 0) {
    return ogImage(
      <TypographicOg
        kicker={null}
        title={SITE_TITLE}
        subtitle="Artist · Engineer · Author — digital art, fiction and games from New York City."
      />
    );
  }

  return ogImage(
    <OgFrame>
      <div
        style={{
          display: 'flex',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', width: 520 }}>
          <PixelTitle size={38}>{SITE_TITLE}</PixelTitle>
          <div
            style={{
              display: 'flex',
              fontFamily: PIXEL_FONT,
              fontSize: 16,
              lineHeight: 1.6,
              letterSpacing: 1,
              color: ogColors.muted,
              marginTop: 30,
            }}
          >
            {SITE_TAGLINE.toUpperCase()}
          </div>
          <div
            style={{
              display: 'flex',
              fontFamily: SANS_FONT,
              fontSize: 22,
              lineHeight: 1.45,
              color: ogColors.faint,
              marginTop: 22,
            }}
          >
            Digital art, fiction and games from New York City.
          </div>
        </div>
        <Mosaic thumbs={thumbs} cell={CELL} />
      </div>
    </OgFrame>
  );
}
