'use client';

import { useState, useEffect, useMemo } from 'react';
import { useGallery } from '@/context/GalleryContext';
import { ArtworkImage, ArtworkMetadata } from '@/types/artwork';
import ArtworkMetadataForm from './ArtworkMetadataForm';

export default function ImageManager() {
  const { 
    images, 
    setImages, 
    projects, 
    fetchProjects, 
    fetchImages,
    refreshProjectCounts 
  } = useGallery();
  const [selectedImage, setSelectedImage] = useState<ArtworkImage | null>(null);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('unassigned');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    fetchProjects();
    fetchImages();
    refreshProjectCounts();
  }, [fetchProjects, fetchImages, refreshProjectCounts]);

  const filteredImages = useMemo(() => {
    if (selectedProjectFilter === 'all') return images;
    if (selectedProjectFilter === 'unassigned') {
      return images.filter(img => !img.metadata.projectId);
    }
    return images.filter(img => img.metadata.projectId === selectedProjectFilter);
  }, [images, selectedProjectFilter]);

  const paginatedImages = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredImages.slice(start, end);
  }, [filteredImages, page]);

  const totalPages = Math.ceil(filteredImages.length / ITEMS_PER_PAGE);

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectFilter(projectId);
    setPage(1); // Reset to first page when changing projects
    setSelectedImage(null); // Clear selected image
  };

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
      
      // Refresh project counts after updating an image
      refreshProjectCounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update image');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-2xl font-semibold text-white">Manage Images</h2>
        
        {/* Project Filter */}
        <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg border border-zinc-800">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-zinc-300">
              Filter by Project:
              <select
                value={selectedProjectFilter}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="ml-2 rounded-md border-zinc-700 bg-zinc-800 text-white shadow-sm focus:border-white focus:ring-white"
              >
                <option value="all">All Images</option>
                <option value="unassigned">Unassigned Images</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <span className="px-3 py-1 bg-zinc-800 rounded-md border border-zinc-700 text-sm text-zinc-300">
            {filteredImages.length} image{filteredImages.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Image List */}
        <div className="flex flex-col h-[calc(100vh-14rem)] min-h-[700px] bg-zinc-900 rounded-lg border border-zinc-800">
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {paginatedImages.length > 0 ? (
              <div className="grid gap-3">
                {paginatedImages.map((image) => (
                  <div
                    key={image.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedImage?.id === image.id 
                        ? 'border-white bg-zinc-800 shadow-md ring-1 ring-white/20' 
                        : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800 hover:shadow-lg hover:shadow-black/20 active:bg-zinc-700 active:transform active:scale-[0.995]'
                    }`}
                    onClick={() => setSelectedImage(image)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-24 h-24 relative rounded-md overflow-hidden flex-shrink-0 bg-zinc-800">
                        <img
                          src={image.url}
                          alt={image.metadata.title}
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium truncate text-white">{image.metadata.title}</h4>
                        <p className="text-sm text-zinc-400 mt-1">
                          {getProjectName(image.metadata.projectId)}
                        </p>
                        {image.metadata.tags && image.metadata.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {image.metadata.tags.map(tag => (
                              <span key={tag} className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-xs border border-zinc-700">
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
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-zinc-400 space-y-2">
                <p className="text-lg">No images found</p>
                <p className="text-sm text-zinc-500">
                  {selectedProjectFilter === 'unassigned' 
                    ? 'All images have been assigned to projects'
                    : selectedProjectFilter === 'all'
                    ? 'Upload some images to get started'
                    : 'Try selecting a different project'}
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="h-14 flex items-center justify-between px-4 border-t border-zinc-800 bg-zinc-900">
            {totalPages > 1 ? (
              <div className="flex items-center justify-between w-full">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm border border-zinc-700 text-zinc-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-800 hover:border-zinc-500 hover:text-white active:bg-zinc-700 active:transform active:scale-[0.98] transition-all"
                >
                  Previous
                </button>
                <span className="text-sm text-zinc-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-sm border border-zinc-700 text-zinc-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-800 hover:border-zinc-500 hover:text-white active:bg-zinc-700 active:transform active:scale-[0.98] transition-all"
                >
                  Next
                </button>
              </div>
            ) : (
              <div className="w-full text-center text-sm text-zinc-400">
                {paginatedImages.length} of {filteredImages.length} images
              </div>
            )}
          </div>
        </div>

        {/* Edit Form */}
        <div className="h-[calc(100vh-14rem)] min-h-[700px] bg-zinc-900 rounded-lg border border-zinc-800">
          {selectedImage ? (
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-zinc-800 bg-zinc-900">
                <h3 className="text-lg font-medium text-white">Edit Image</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div className="aspect-video w-full relative rounded-lg overflow-hidden bg-zinc-800">
                  <img
                    src={selectedImage.url}
                    alt={selectedImage.metadata.title}
                    className="object-contain w-full h-full"
                  />
                </div>

                <div className="space-y-6">
                  <ArtworkMetadataForm
                    projects={projects}
                    initialMetadata={selectedImage.metadata}
                    onSubmit={handleSaveMetadata}
                    isUploading={isLoading}
                  />

                  {successMessage && (
                    <div className="p-4 bg-emerald-900/50 text-emerald-300 rounded-lg border border-emerald-800">
                      {successMessage}
                    </div>
                  )}

                  {error && (
                    <div className="p-4 bg-red-900/50 text-red-300 rounded-lg border border-red-800">
                      {error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 p-8 text-center space-y-2">
              <p className="text-lg">No image selected</p>
              <p className="text-sm text-zinc-500">Select an image from the list to edit its details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 