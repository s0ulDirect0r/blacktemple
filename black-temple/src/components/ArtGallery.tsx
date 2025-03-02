'use client';

import { useEffect } from 'react';
import { useGallery } from '@/context/GalleryContext';
import ProjectFilter from './ProjectFilter';

export default function ArtGallery() {
  const { images, setImages, selectedProjectId } = useGallery();

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const url = selectedProjectId 
          ? `/api/images?projectId=${selectedProjectId}`
          : '/api/images';
        
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setImages(data);
        }
      } catch (error) {
        console.error('Failed to fetch images:', error);
      }
    };

    fetchImages();
  }, [selectedProjectId, setImages]);

  return (
    <div className="relative min-h-screen bg-black">
      <ProjectFilter />
      <header className="relative z-10 px-4 md:px-8 pt-6 pb-12 flex items-center">
        <div className="w-16" />
        <h1 className="text-5xl font-bold text-white flex-1 text-center tracking-wide">
          The Black Temple
        </h1>
      </header>
      
      <main className="px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((image) => (
            <div
              key={image.id}
              className="group relative aspect-video overflow-hidden rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all"
            >
              <img
                src={image.url}
                alt={image.metadata.title}
                className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-medium text-lg">
                    {image.metadata.title}
                  </h3>
                  {image.metadata.description && (
                    <p className="text-white/80 text-sm mt-1 line-clamp-2">
                      {image.metadata.description}
                    </p>
                  )}
                  {image.metadata.tags && image.metadata.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {image.metadata.tags.map(tag => (
                        <span 
                          key={tag} 
                          className="px-2 py-0.5 bg-black/50 text-white/90 rounded-full text-xs border border-white/20"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
} 