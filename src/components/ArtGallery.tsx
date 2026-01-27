'use client';

import { useEffect, useState } from 'react';
import { useGallery } from '@/context/GalleryContext';
import { GALLERY_PAGE_SIZE } from '@/constants/gallery';
import Link from 'next/link';
import Image from 'next/image';

const SKELETON_PLACEHOLDERS = 6;

export default function ArtGallery() {
  const { images, fetchImages, selectedProjectId, hasMoreImages } = useGallery();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setIsLoadingMore(false);
      try {
        await fetchImages({ limit: GALLERY_PAGE_SIZE, mode: 'replace' });
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [fetchImages]);


  const handleLoadMore = async () => {
    if (isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    try {
      await fetchImages({ limit: GALLERY_PAGE_SIZE, offset: images.length, mode: 'append' });
    } catch (error) {
      console.error('Failed to load more images:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <main className="pb-16">
        {isLoading ? (
          <div className="py-16">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[...Array(SKELETON_PLACEHOLDERS)].map((_, index) => (
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
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {images.map((image) => (
                <Link
                key={image.id}
                href={`/artwork/${image.id}`}
                className="group relative aspect-video overflow-hidden rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-all hover:shadow-lg hover:shadow-black/20"
              >
                <Image
                  src={image.url}
                  alt={image.metadata.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  loading="lazy"
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

            {hasMoreImages && (
              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="px-6 py-2 rounded-full border border-zinc-700 text-zinc-200 hover:border-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
