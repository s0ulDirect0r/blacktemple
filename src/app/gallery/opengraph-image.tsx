import { getGalleryImages } from '@/lib/gallery';
import {
  Kicker,
  Mosaic,
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgFrame,
  PixelTitle,
  Subtitle,
  TypographicOg,
  fetchThumbnails,
  ogImage,
} from '@/lib/og';
import { PAGE_META, SITE_TITLE } from '@/lib/site';

export const alt = `Art — digital artwork by Matthew D. Huff`;
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
    console.error('[og] gallery: could not load gallery images:', error);
    return [];
  }
}

export default async function Image() {
  const thumbs = await recentThumbnails();

  if (thumbs.length === 0) {
    return ogImage(<TypographicOg title="ART" subtitle={PAGE_META.gallery.description} seed={11} />);
  }

  return ogImage(
    <OgFrame seed={11}>
      <div
        style={{
          display: 'flex',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', width: 500 }}>
          <Kicker>{SITE_TITLE}</Kicker>
          <PixelTitle size={72}>ART</PixelTitle>
          <Subtitle size={24}>Digital paintings, portraits and visions from the Black Temple gallery.</Subtitle>
        </div>
        <Mosaic thumbs={thumbs} cell={CELL} />
      </div>
    </OgFrame>
  );
}
