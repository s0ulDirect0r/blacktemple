'use client';

import { artworkDisplaySrc } from '@/lib/artwork-display';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArtworkImage, Project } from '@/types/artwork';
import { FiArrowLeft, FiTag, FiFolder, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';
import { aspectRatioOf, PLACEHOLDER_RATIO } from '@/lib/masonry';

interface Siblings {
  prev: ArtworkImage | null;
  next: ArtworkImage | null;
}

// Client half of the artwork detail route. The server `page.tsx` next to this
// file owns metadata (generateMetadata) and passes the resolved id down.
export default function ArtworkPageClient({ id }: { id: string }) {

  const [artwork, setArtwork] = useState<ArtworkImage | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [siblings, setSiblings] = useState<Siblings>({ prev: null, next: null });
  const [learnedRatio, setLearnedRatio] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const fetchArtwork = async () => {
      try {
        setLoading(true);
        setError(null);
        setSiblings({ prev: null, next: null });
        setLearnedRatio(null);
        const response = await fetch(`/api/images/${id}`);

        if (!response.ok) {
          throw new Error('Failed to fetch artwork');
        }

        const data = (await response.json()) as ArtworkImage;
        if (cancelled) return;
        setArtwork(data);

        // If the artwork has a project, fetch the project details
        if (data.metadata.projectId) {
          const projectResponse = await fetch(`/api/projects/${data.metadata.projectId}`);
          if (projectResponse.ok) {
            const projectData = await projectResponse.json();
            if (!cancelled) setProject(projectData);
          }
        } else {
          setProject(null);
        }

        // Neighbours within the same project (or the unassigned pool), in
        // gallery order (newest first). limit=0 returns the whole set.
        const siblingParams = new URLSearchParams({ limit: '0' });
        if (data.metadata.projectId) {
          siblingParams.set('projectId', data.metadata.projectId);
        } else {
          siblingParams.set('unassigned', 'true');
        }
        const siblingResponse = await fetch(`/api/images?${siblingParams.toString()}`);
        if (siblingResponse.ok) {
          const siblingData = (await siblingResponse.json()) as { images: ArtworkImage[] };
          const list = siblingData.images ?? [];
          const index = list.findIndex((item) => item.id === data.id);
          if (!cancelled && index !== -1) {
            setSiblings({
              prev: list[index - 1] ?? null,
              next: list[index + 1] ?? null,
            });
          }
        }
      } catch (err) {
        console.error('Error fetching artwork:', err);
        if (!cancelled) {
          setError('Could not load the artwork. It may have been removed or does not exist.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchArtwork();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Keyboard navigation between neighbouring pieces.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'ArrowLeft' && siblings.prev) {
        router.push(`/artwork/${siblings.prev.id}`);
      } else if (event.key === 'ArrowRight' && siblings.next) {
        router.push(`/artwork/${siblings.next.id}`);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, siblings]);

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/gallery');
    }
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

  const ratio = aspectRatioOf(artwork.width, artwork.height) ?? learnedRatio ?? PLACEHOLDER_RATIO;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Image — native aspect ratio, capped at 80vh */}
      <div className="relative w-full px-4 pt-16 sm:px-8 sm:pt-20">
        <button
          onClick={handleBack}
          className="absolute top-4 left-4 z-10 flex items-center space-x-2 px-3 py-2 bg-black/60 backdrop-blur-sm rounded-lg text-zinc-300 hover:text-white hover:bg-black/80 transition-colors"
        >
          <FiArrowLeft />
          <span>Back to Gallery</span>
        </button>

        <div className="flex justify-center">
          <div
            className="relative w-full"
            style={{
              aspectRatio: String(ratio),
              maxWidth: `calc(80vh * ${ratio})`,
            }}
          >
            <Image
              src={artworkDisplaySrc(artwork.url)}
              alt={artwork.metadata.title}
              fill
              className="object-contain"
              sizes="100vw"
              priority
              onLoad={(event) => {
                const target = event.currentTarget;
                const natural = aspectRatioOf(target.naturalWidth, target.naturalHeight);
                if (natural !== null && aspectRatioOf(artwork.width, artwork.height) === null) {
                  setLearnedRatio(natural);
                }
              }}
            />
          </div>
        </div>
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

        {/* Prev / next within the same project */}
        {(siblings.prev || siblings.next) && (
          <nav
            aria-label="Neighbouring artwork"
            className="mt-10 flex w-full max-w-3xl items-stretch justify-between gap-3 border-t border-zinc-800 pt-6"
          >
            {siblings.prev ? (
              <Link
                href={`/artwork/${siblings.prev.id}`}
                className="group flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-2 text-left text-zinc-400 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <FiChevronLeft className="h-4 w-4 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-[10px] uppercase tracking-widest text-zinc-600">Previous</span>
                  <span className="block truncate text-sm">{siblings.prev.metadata.title}</span>
                </span>
              </Link>
            ) : (
              <span className="flex-1" />
            )}
            {siblings.next ? (
              <Link
                href={`/artwork/${siblings.next.id}`}
                className="group flex min-w-0 flex-1 items-center justify-end gap-2 rounded-md px-2 py-2 text-right text-zinc-400 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <span className="min-w-0">
                  <span className="block text-[10px] uppercase tracking-widest text-zinc-600">Next</span>
                  <span className="block truncate text-sm">{siblings.next.metadata.title}</span>
                </span>
                <FiChevronRight className="h-4 w-4 shrink-0" />
              </Link>
            ) : (
              <span className="flex-1" />
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
