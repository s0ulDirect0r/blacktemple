import { readFile } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';
import { OG_CONTENT_TYPE, OG_SIZE, OgFrame, PIXEL_FONT, PixelTitle, SANS_FONT, ogColors, ogImage } from '@/lib/og';

export const alt = 'Matthew D. Huff · mystery & dopeness — The Vow Sigil';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const original = await readFile(join(process.cwd(), 'public/images/portfolio/paintings/the-vow-sigil.jpg'));
  const sigil = await sharp(original).resize(1080, 1080).jpeg({ quality: 90 }).toBuffer();

  return ogImage(
    <OgFrame seed={31}>
      <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: 560, paddingRight: 40 }}>
          <PixelTitle size={40}>MATTHEW D. HUFF</PixelTitle>
          <div style={{ display: 'flex', fontFamily: PIXEL_FONT, fontSize: 23, lineHeight: 1.5, color: '#e4e4e7', marginTop: 30 }}>
            mystery &amp; dopeness
          </div>
          <div style={{ display: 'flex', fontFamily: SANS_FONT, fontSize: 23, lineHeight: 1.5, color: ogColors.muted, marginTop: 30 }}>
            Games, paintings, stories, and experiments that stoke aliveness and curiosity.
          </div>
        </div>
        <img src={`data:image/jpeg;base64,${sigil.toString('base64')}`} alt="" width={440} height={440} style={{ width: 440, height: 440, objectFit: 'contain', flexShrink: 0 }} />
      </div>
    </OgFrame>
  );
}
