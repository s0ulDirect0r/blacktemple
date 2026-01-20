'use client';

import ArtGallery from '@/components/ArtGallery';
import HorizontalProjectFilter from '@/components/HorizontalProjectFilter';
import { GalleryProvider } from '@/context/GalleryContext';

export default function GalleryZoneContent() {
  return (
    <GalleryProvider>
      <h1 className="text-3xl font-bold text-center mb-6 text-white">Gallery</h1>
      <HorizontalProjectFilter />
      <ArtGallery />
    </GalleryProvider>
  );
}
