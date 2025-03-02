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
    <div>
      <ProjectFilter />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map((image) => (
          <div
            key={image.id}
            className="relative aspect-video overflow-hidden rounded-lg shadow-lg"
          >
            <img
              src={image.url}
              alt={image.metadata.title}
              className="object-cover w-full h-full"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
              {/* <h3 className="text-white font-medium">{image.metadata.title}</h3>
              {image.metadata.description && (
                <p className="text-white/80 text-sm mt-1">
                  {image.metadata.description}
                </p>
              )} */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 