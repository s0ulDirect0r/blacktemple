'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { ArtworkImage, Project } from '@/types/artwork';

interface GalleryContextType {
  images: ArtworkImage[];
  setImages: (images: ArtworkImage[]) => void;
  projects: Project[];
  setProjects: (projects: Project[]) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  addImage: (image: ArtworkImage) => void;
}

const GalleryContext = createContext<GalleryContextType | undefined>(undefined);

export function GalleryProvider({ children }: { children: ReactNode }) {
  const [images, setImages] = useState<ArtworkImage[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const addImage = (image: ArtworkImage) => {
    setImages(prev => [image, ...prev]);
  };

  return (
    <GalleryContext.Provider value={{
      images,
      setImages,
      projects,
      setProjects,
      selectedProjectId,
      setSelectedProjectId,
      addImage
    }}>
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