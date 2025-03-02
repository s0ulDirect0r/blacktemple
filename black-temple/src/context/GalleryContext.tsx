'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { ArtworkImage, Project } from '@/types/artwork';

interface GalleryContextType {
  images: ArtworkImage[];
  setImages: (images: ArtworkImage[] | ((prev: ArtworkImage[]) => ArtworkImage[])) => void;
  projects: Project[];
  setProjects: (projects: Project[]) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  addImage: (image: ArtworkImage) => void;
  addProject: (project: Project) => void;
  fetchProjects: () => Promise<void>;
  fetchImages: () => Promise<void>;
}

const GalleryContext = createContext<GalleryContextType | undefined>(undefined);

export function GalleryProvider({ children }: { children: ReactNode }) {
  const [images, setImages] = useState<ArtworkImage[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const addImage = (image: ArtworkImage) => {
    setImages(prev => [image, ...prev]);
  };

  const addProject = (project: Project) => {
    setProjects(prev => [...prev, project]);
  };

  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  }, []);

  const fetchImages = useCallback(async () => {
    try {
      const response = await fetch('/api/images');
      if (response.ok) {
        const data = await response.json();
        setImages(data);
      }
    } catch (error) {
      console.error('Failed to fetch images:', error);
    }
  }, []);

  return (
    <GalleryContext.Provider value={{
      images,
      setImages,
      projects,
      setProjects,
      selectedProjectId,
      setSelectedProjectId,
      addImage,
      addProject,
      fetchProjects,
      fetchImages
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