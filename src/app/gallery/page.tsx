import { PAGE_META, pageMetadata } from '@/lib/site';

export const metadata = pageMetadata({ ...PAGE_META.gallery, path: '/gallery' });

// Gallery page - content rendered by GalleryZone in 3D scene
// This page renders null as the zone handles display
export default function GalleryPage() {
  return null;
}
