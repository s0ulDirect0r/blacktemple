import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgFrame,
  PIXEL_FONT,
  PixelTitle,
  SANS_FONT,
  TypographicOg,
  fetchImageData,
  ogColors,
  ogImage,
} from '@/lib/og';
import { BOOK_COVER_URL, BOOK_TITLE, SITE_NAME } from '@/lib/site';

export const alt = `${BOOK_TITLE} — a novel by Matthew D. Huff`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
// Regenerated hourly in the background; crawlers always get the cached PNG.
export const revalidate = 3600;

const COVER_W = 287;
const COVER_H = 430;

export default async function Image() {
  const cover = await fetchImageData(BOOK_COVER_URL, {
    width: COVER_W * 2,
    height: COVER_H * 2,
    fit: 'inside',
  });

  if (!cover) {
    return ogImage(
      <TypographicOg
        title={BOOK_TITLE.toUpperCase()}
        subtitle="A novel by Matthew D. Huff. Available on Amazon and Gumroad."
        seed={23}
      />
    );
  }

  return ogImage(
    <OgFrame seed={23}>
      <div style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
        <div
          style={{
            display: 'flex',
            width: COVER_W + 4,
            height: COVER_H + 4,
            border: `2px solid ${ogColors.border}`,
            borderRadius: 4,
            overflow: 'hidden',
            flexShrink: 0,
            boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
          }}
        >
          <img
            src={cover}
            width={COVER_W}
            height={COVER_H}
            alt=""
            style={{ width: COVER_W, height: COVER_H, objectFit: 'cover' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 72, width: 620 }}>
          <div
            style={{
              display: 'flex',
              fontFamily: PIXEL_FONT,
              fontSize: 14,
              letterSpacing: 1,
              color: ogColors.faint,
              marginBottom: 26,
            }}
          >
            A NOVEL
          </div>
          <PixelTitle size={40}>{BOOK_TITLE.toUpperCase()}</PixelTitle>
          <div
            style={{
              display: 'flex',
              fontFamily: SANS_FONT,
              fontSize: 26,
              color: ogColors.muted,
              marginTop: 26,
            }}
          >
            by {SITE_NAME}
          </div>
          <div
            style={{
              display: 'flex',
              fontFamily: SANS_FONT,
              fontSize: 20,
              color: ogColors.faint,
              marginTop: 36,
            }}
          >
            Available on Amazon (Kindle and paperback) and Gumroad.
          </div>
        </div>
      </div>
    </OgFrame>
  );
}
