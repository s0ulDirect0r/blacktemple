// The hosted optimizer returned this 10,800px original unresized, so even
// thumbnail requests downloaded the whole 20 MB JPEG. Keep original URLs
// in the artwork records; use a display derivative only for rendered images.
const DISPLAY_IMAGES: Record<string, string> = {
  'https://zp7hauqhmxup1nll.public.blob.vercel-storage.com/JUSTICE_&_COMPASSION-uslq1rNmZ51lXC1UuolxqCnAOmpGFJ.jpg': '/images/optimized/justice-compassion.jpg',
};

export function artworkDisplaySrc(url: string): string {
  return DISPLAY_IMAGES[url] ?? url;
}
