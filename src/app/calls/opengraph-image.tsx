import { readFile } from 'fs/promises';
import { join } from 'path';
import { formatPrice } from '@/lib/calls/config';
import { OG_CONTENT_TYPE, OG_SIZE, PIXEL_FONT, SANS_FONT, ogImage } from '@/lib/og';

export const alt = 'Desire Confessionals: a one-on-one conversation with Matthew D. Huff';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** The purple star, pre-rendered by scripts/render-calls-star.ts. */
async function starBackground(): Promise<string | null> {
  try {
    // Literal join(process.cwd(), ...) so output file tracing bundles the PNG.
    const png = await readFile(join(process.cwd(), 'src/app/calls/og-star.png'));
    return `data:image/png;base64,${png.toString('base64')}`;
  } catch (error) {
    console.error('[og] calls: could not read the star background:', error);
    return null;
  }
}

export default async function Image() {
  const star = await starBackground();

  return ogImage(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        backgroundColor: '#000',
        color: '#fff',
        fontFamily: SANS_FONT,
      }}
    >
      {star ? (
        <img src={star} width={OG_SIZE.width} height={OG_SIZE.height} alt="" style={{ position: 'absolute', left: 0, top: 0 }} />
      ) : null}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: 780, padding: '0 0 36px 80px' }}>
        <div style={{ display: 'flex', fontFamily: PIXEL_FONT, fontSize: 18, color: '#b9f5ff', letterSpacing: 1 }}>
          WHAT DO YOU WANT?
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 32, fontFamily: PIXEL_FONT, fontSize: 52, lineHeight: 1.45 }}>
          <div style={{ display: 'flex' }}>DESIRE</div>
          <div style={{ display: 'flex', color: '#c4b5fd', textShadow: '0 0 20px rgba(196,181,253,0.45)' }}>CONFESSIONALS</div>
        </div>
        <div style={{ display: 'flex', marginTop: 32, maxWidth: 640, fontSize: 32, lineHeight: 1.4, color: '#f4f4f5' }}>
          Get honest about what you want, explore it together, and find a next step toward it.
        </div>
        <div style={{ display: 'flex', marginTop: 28, fontSize: 23, color: '#a1a1aa', letterSpacing: 0.5 }}>
          {`60–90 minutes · ${formatPrice()} · On Google Meet`}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 80,
          bottom: 48,
          display: 'flex',
          fontFamily: PIXEL_FONT,
          fontSize: 14,
          color: '#a1a1aa',
          letterSpacing: 1,
        }}
      >
        BLACKTEMPLE.DEV/CALLS
      </div>
    </div>
  );
}
