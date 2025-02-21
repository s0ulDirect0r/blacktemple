'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface ArtworkImage {
  public_id: string;
  secure_url: string;
  created_at: string;
}

interface GalleryContextType {
  images: ArtworkImage[];
  addImage: (image: ArtworkImage) => void;
  setImages: (images: ArtworkImage[]) => void;
}

const GalleryContext = createContext<GalleryContextType | undefined>(undefined);

export function GalleryProvider({ children }: { children: ReactNode }) {
  const [images, setImages] = useState<ArtworkImage[]>([]);

  const addImage = (newImage: ArtworkImage) => {
    setImages((prevImages) => [newImage, ...prevImages]);
  };

  return (
    <GalleryContext.Provider value={{ images, addImage, setImages }}>
      {children}
    </GalleryContext.Provider>
  );
}

export function useGallery() {
  const context = useContext(GalleryContext);
  if (context === undefined) {
    throw new Error('useGallery must be used within a GalleryProvider');
  }
  return context;
} 