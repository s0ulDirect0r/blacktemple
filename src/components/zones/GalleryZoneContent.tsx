'use client';

import ArtGallery from '@/components/ArtGallery';
import HorizontalProjectFilter from '@/components/HorizontalProjectFilter';
import { GalleryProvider } from '@/context/GalleryContext';

export default function GalleryZoneContent() {
  return (
    <GalleryProvider>
      <h1 className="font-pixel text-lg sm:text-xl md:text-2xl text-center mb-6 text-white">Gallery</h1>
      <HorizontalProjectFilter />
      <ArtGallery />
    </GalleryProvider>
  );
}
