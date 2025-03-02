'use client';

import { useEffect, useState } from 'react';
import { useGallery } from '@/context/GalleryContext';
import ProjectFilter from './ProjectFilter';
import Link from 'next/link';

export default function ArtGallery() {
  const { images, setImages, selectedProjectId, refreshProjectCounts } = useGallery();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchImages = async () => {
      setIsLoading(true);
      try {
        const url = selectedProjectId 
          ? `/api/images?projectId=${selectedProjectId}`
          : '/api/images';
        
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setImages(data);
          
          // Refresh project counts after loading images
          refreshProjectCounts();
        }
      } catch (error) {
        console.error('Failed to fetch images:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
  }, [selectedProjectId, setImages, refreshProjectCounts]);

  return (
    <div className="relative min-h-screen bg-black">
      <ProjectFilter />
      <header className="relative z-10 px-4 md:px-8 pt-6 pb-12 flex items-center">
        <div className="w-16" />
        <h1 className="text-5xl font-bold text-white flex-1 text-center tracking-wide">
          The Black Temple
        </h1>
      </header>
      
      <main className="px-4 md:px-8 pb-16">
        {isLoading ? (
          <div className="py-16">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, index) => (
                <div 
                  key={index} 
                  className="aspect-video rounded-lg bg-zinc-900 border border-zinc-800 animate-pulse"
                >
                  <div className="h-full w-full flex items-center justify-center">
                    <div className="w-8 h-8 border-t-2 border-zinc-500 border-solid rounded-full animate-spin"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
            <p className="text-xl">No images found</p>
            <p className="text-sm mt-2">
              {selectedProjectId === 'unassigned' 
                ? 'All images have been assigned to projects'
                : 'Try selecting a different project or upload some images'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((image) => (
              <Link
                key={image.id}
                href={`/artwork/${image.id}`}
                className="group relative aspect-video overflow-hidden rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-all hover:shadow-lg hover:shadow-black/20"
              >
                <img
                  src={image.url}
                  alt={image.metadata.title}
                  className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
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
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
} 