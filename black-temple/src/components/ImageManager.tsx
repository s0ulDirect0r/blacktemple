'use client';

import { useState, useEffect } from 'react';
import { useGallery } from '@/context/GalleryContext';
import { ArtworkImage, ArtworkMetadata } from '@/types/artwork';
import ArtworkMetadataForm from './ArtworkMetadataForm';

export default function ImageManager() {
  const { images, setImages, projects, fetchProjects, fetchImages } = useGallery();
  const [selectedImage, setSelectedImage] = useState<ArtworkImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchImages();
  }, [fetchProjects, fetchImages]);

  const getProjectName = (projectId: string | undefined | null): string => {
    if (!projectId) return 'No Project';
    const project = projects.find(p => p.id.toString() === projectId.toString());
    return project ? project.name : 'Unknown Project';
  };

  const handleSaveMetadata = async (metadata: ArtworkMetadata) => {
    if (!selectedImage) return;
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const token = sessionStorage.getItem('adminSession');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/images/${selectedImage.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ metadata }),
      });

      if (!response.ok) {
        throw new Error('Failed to update image metadata');
      }

      const updatedImage = await response.json() as ArtworkImage;
      setImages(prev => prev.map(img => img.id === updatedImage.id ? updatedImage : img));
      setSuccessMessage('Image updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update image');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-semibold">Manage Images</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image List */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Gallery Images</h3>
          <div className="grid gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                className={`p-4 border rounded-md cursor-pointer transition-colors ${
                  selectedImage?.id === image.id ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-400'
                }`}
                onClick={() => setSelectedImage(image)}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 relative">
                    <img
                      src={image.url}
                      alt={image.metadata.title}
                      className="object-cover w-full h-full rounded"
                    />
                  </div>
                  <div>
                    <h4 className="font-medium">{image.metadata.title}</h4>
                    <p className="text-sm text-gray-500">
                      {getProjectName(image.metadata.projectId)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Edit Form */}
        {selectedImage && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Edit Image</h3>
            
            <div className="aspect-video w-full relative rounded-lg overflow-hidden">
              <img
                src={selectedImage.url}
                alt={selectedImage.metadata.title}
                className="object-contain w-full h-full"
              />
            </div>

            <ArtworkMetadataForm
              projects={projects}
              initialMetadata={selectedImage.metadata}
              onSubmit={handleSaveMetadata}
              isUploading={isLoading}
            />

            {successMessage && (
              <div className="p-4 bg-green-100 text-green-700 rounded-md">
                {successMessage}
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 