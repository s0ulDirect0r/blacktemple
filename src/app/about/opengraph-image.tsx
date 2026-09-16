import { OG_CONTENT_TYPE, OG_SIZE, TypographicOg, ogImage } from '@/lib/og';
import { PAGE_META } from '@/lib/site';

export const alt = 'About Matthew D. Huff';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return ogImage(<TypographicOg title="ABOUT ME" subtitle={PAGE_META.about.description} seed={67} />);
}
