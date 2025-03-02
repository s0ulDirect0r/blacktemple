'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArtworkImage, Project } from '@/types/artwork';
import { FiArrowLeft, FiTag, FiFolder } from 'react-icons/fi';
import Link from 'next/link';
import { use } from 'react';

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
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <button 
          onClick={handleBack}
          className="flex items-center space-x-2 mb-8 text-zinc-400 hover:text-white transition-colors"
        >
          <FiArrowLeft />
          <span>Back to Gallery</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image */}
          <div className="bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800">
            <img 
              src={artwork.url} 
              alt={artwork.metadata.title}
              className="w-full h-auto object-contain"
            />
          </div>

          {/* Metadata */}
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
            <h1 className="text-3xl font-bold mb-4">{artwork.metadata.title}</h1>
            
            {artwork.metadata.description && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2 text-zinc-300">Description</h2>
                <p className="text-zinc-400 whitespace-pre-line">{artwork.metadata.description}</p>
              </div>
            )}

            {artwork.metadata.projectId && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2 text-zinc-300">Project</h2>
                <Link 
                  href={`/?project=${artwork.metadata.projectId}`}
                  className="inline-flex items-center space-x-2 px-3 py-1 bg-zinc-800 rounded-lg text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  <FiFolder />
                  <span>{project ? project.name : 'Loading project...'}</span>
                </Link>
              </div>
            )}

            {artwork.metadata.tags && artwork.metadata.tags.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-2 text-zinc-300">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {artwork.metadata.tags.map(tag => (
                    <span 
                      key={tag}
                      className="inline-flex items-center space-x-1 px-3 py-1 bg-zinc-800 rounded-full text-zinc-300"
                    >
                      <FiTag size={14} />
                      <span>{tag}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 text-sm text-zinc-500">
              <p>Created: {new Date(artwork.metadata.created_at).toLocaleDateString()}</p>
              <p>Last updated: {new Date(artwork.metadata.updated_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 