'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArtworkImage, Project } from '@/types/artwork';
import { FiArrowLeft, FiTag, FiFolder } from 'react-icons/fi';
import Link from 'next/link';
import { use } from 'react';
import Image from 'next/image';

export default function ArtworkPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap the params Promise using React.use()
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  
  const [artwork, setArtwork] = useState<ArtworkImage | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchArtwork = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/images/${id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch artwork');
        }
        
        const data = await response.json();
        setArtwork(data);
        
        // If the artwork has a project, fetch the project details
        if (data.metadata.projectId) {
          const projectResponse = await fetch(`/api/projects/${data.metadata.projectId}`);
          if (projectResponse.ok) {
            const projectData = await projectResponse.json();
            setProject(projectData);
          }
        }
      } catch (err) {
        console.error('Error fetching artwork:', err);
        setError('Could not load the artwork. It may have been removed or does not exist.');
      } finally {
        setLoading(false);
      }
    };

    fetchArtwork();
  }, [id]);

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading artwork...</div>
      </div>
    );
  }

  if (error || !artwork) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="text-white text-xl mb-4">{error || 'Artwork not found'}</div>
        <button 
          onClick={handleBack}
          className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Image — dominates the viewport */}
      <div className="relative w-full" style={{ height: '80vh' }}>
        <button
          onClick={handleBack}
          className="absolute top-4 left-4 z-10 flex items-center space-x-2 px-3 py-2 bg-black/60 backdrop-blur-sm rounded-lg text-zinc-300 hover:text-white hover:bg-black/80 transition-colors"
        >
          <FiArrowLeft />
          <span>Back to Gallery</span>
        </button>

        <Image
          src={artwork.url}
          alt={artwork.metadata.title}
          fill
          className="object-contain"
          sizes="100vw"
          priority
        />
      </div>

      {/* Metadata — centered strip below */}
      <div className="px-6 md:px-12 lg:px-20 py-8 flex flex-col items-center text-center">
        <h1 className="text-3xl font-bold mb-3">{artwork.metadata.title}</h1>

        {artwork.metadata.description && (
          <p className="text-zinc-400 whitespace-pre-line mb-4 max-w-3xl">{artwork.metadata.description}</p>
        )}

        <div className="flex flex-wrap justify-center items-center gap-3 text-sm">
          {artwork.metadata.projectId && (
            <Link
              href={`/?project=${artwork.metadata.projectId}`}
              className="inline-flex items-center space-x-2 px-3 py-1 bg-zinc-800 rounded-lg text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              <FiFolder />
              <span>{project ? project.name : 'Loading project...'}</span>
            </Link>
          )}

          {artwork.metadata.tags && artwork.metadata.tags.length > 0 && (
            artwork.metadata.tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center space-x-1 px-3 py-1 bg-zinc-800 rounded-full text-zinc-300"
              >
                <FiTag size={14} />
                <span>{tag}</span>
              </span>
            ))
          )}

          <span className="text-zinc-600">
            {new Date(artwork.metadata.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
} 