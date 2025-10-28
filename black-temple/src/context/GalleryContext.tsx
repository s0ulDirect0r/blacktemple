'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { ArtworkImage, Project } from '@/types/artwork';
import { ProjectCountSummary } from '@/types/gallery';

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
  fetchImages: (options?: FetchImagesOptions) => Promise<void>;
  projectCounts: ProjectCountSummary;
  refreshProjectCounts: () => Promise<void>;
  hasMoreImages: boolean;
}

interface GalleryApiResponse {
  images: ArtworkImage[];
  hasMore?: boolean;
}

const GalleryContext = createContext<GalleryContextType | undefined>(undefined);

interface FetchImagesOptions {
  projectId?: string | null;
  limit?: number;
  offset?: number;
  mode?: 'replace' | 'append';
}

interface GalleryProviderProps {
  children: ReactNode;
  initialImages?: ArtworkImage[];
  initialProjects?: Project[];
  initialProjectCounts?: ProjectCountSummary;
  initialHasMore?: boolean;
}

const defaultProjectCounts: ProjectCountSummary = {
  projects: [],
  unassigned: 0,
  total: 0,
};

export function GalleryProvider({
  children,
  initialImages = [],
  initialProjects = [],
  initialProjectCounts = defaultProjectCounts,
  initialHasMore = false,
}: GalleryProviderProps) {
  const [images, setImages] = useState<ArtworkImage[]>(() => [...initialImages]);
  const [projects, setProjects] = useState<Project[]>(() => [...initialProjects]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectCounts, setProjectCounts] = useState<ProjectCountSummary>(() => ({
    projects: initialProjectCounts.projects.map(project => ({ ...project })),
    unassigned: initialProjectCounts.unassigned,
    total: initialProjectCounts.total,
  }));
  const [hasMoreImages, setHasMoreImages] = useState<boolean>(initialHasMore);

  const refreshProjectCounts = useCallback(async () => {
    try {
      const response = await fetch('/api/projects/counts');
      if (response.ok) {
        const data = await response.json();
        setProjectCounts(data);
      }
    } catch (error) {
      console.error('Failed to fetch project counts:', error);
    }
  }, []);

  const addImage = useCallback((image: ArtworkImage) => {
    setImages(prev => [image, ...prev]);
    refreshProjectCounts();
  }, [refreshProjectCounts]);

  const addProject = useCallback((project: Project) => {
    setProjects(prev => [...prev, project]);
  }, []);

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

  const fetchImages = useCallback(async (options: FetchImagesOptions = {}) => {
    const targetProjectId = options.projectId ?? selectedProjectId;
    const mode = options.mode ?? 'replace';
    const params = new URLSearchParams();

    if (targetProjectId === 'unassigned') {
      params.append('unassigned', 'true');
    } else if (targetProjectId) {
      params.append('projectId', targetProjectId);
    }

    if (typeof options.limit === 'number') {
      params.append('limit', String(options.limit));
    }

    if (typeof options.offset === 'number' && options.offset > 0) {
      params.append('offset', String(Math.floor(options.offset)));
    }

    try {
      const query = params.toString();
      const response = await fetch(`/api/images${query ? `?${query}` : ''}`);
      if (response.ok) {
        const data = await response.json() as GalleryApiResponse | ArtworkImage[];

        let fetchedImages: ArtworkImage[] = [];
        let hasMore = false;

        if (Array.isArray(data)) {
          fetchedImages = data;
        } else {
          fetchedImages = data.images;
          hasMore = Boolean(data.hasMore);
        }

        setHasMoreImages(hasMore);

        if (mode === 'append') {
          setImages(prev => {
            if (fetchedImages.length === 0) {
              return prev;
            }
            const existingIds = new Set(prev.map(img => img.id));
            const nextImages = fetchedImages.filter(img => !existingIds.has(img.id));
            if (nextImages.length === 0) {
              return prev;
            }
            return [...prev, ...nextImages];
          });
        } else {
          setImages(fetchedImages);
        }

        if (mode !== 'append') {
          refreshProjectCounts();
        }
      }
    } catch (error) {
      console.error('Failed to fetch images:', error);
    }
  }, [refreshProjectCounts, selectedProjectId]);

  const value = useMemo(() => ({
    images,
    setImages,
    projects,
    setProjects,
    selectedProjectId,
    setSelectedProjectId,
    addImage,
    addProject,
    fetchProjects,
    fetchImages,
    projectCounts,
    refreshProjectCounts,
    hasMoreImages,
  }), [
    images,
    projects,
    selectedProjectId,
    addImage,
    addProject,
    fetchProjects,
    fetchImages,
    projectCounts,
    refreshProjectCounts,
    hasMoreImages,
  ]);

  return (
    <GalleryContext.Provider value={value}>
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
