import { OG_CONTENT_TYPE, OG_SIZE, TypographicOg, ogImage } from '@/lib/og';
import { PAGE_META } from '@/lib/site';

export const alt = 'Resume of Matthew D. Huff';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return ogImage(<TypographicOg title="RESUME" subtitle={PAGE_META.resume.description} seed={53} />);
}
