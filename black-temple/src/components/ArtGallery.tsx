'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface ArtworkImage {
  public_id: string;
  secure_url: string;
  created_at: string;
}

export default function ArtGallery() {
  const [images, setImages] = useState<ArtworkImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const response = await fetch('/api/gallery');
      if (!response.ok) throw new Error('Failed to fetch images');
      const data = await response.json();
      setImages(data.images);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load gallery');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        Error loading gallery: {error}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {images.map((image) => (
        <div
          key={image.public_id}
          className="relative aspect-square overflow-hidden rounded-lg hover:opacity-90 transition-opacity"
        >
          <Image
            src={image.secure_url}
            alt={`Artwork ${image.public_id}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      ))}
      {images.length === 0 && (
        <div className="col-span-full text-center py-10 text-gray-500">
          No images uploaded yet. Start by uploading some artwork!
        </div>
      )}
    </div>
  );
} 