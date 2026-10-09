import { getImagesResponse } from '@/lib/gallery-response';

export async function GET(request: Request) {
  return getImagesResponse(request, async (options) => {
    const { getGalleryImages } = await import('@/lib/gallery');
    return getGalleryImages(options);
  });
}
