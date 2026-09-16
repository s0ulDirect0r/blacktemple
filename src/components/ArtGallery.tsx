'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useGallery } from '@/context/GalleryContext';
import { GALLERY_PAGE_SIZE } from '@/constants/gallery';
import { ArtworkImage } from '@/types/artwork';
import { aspectRatioOf, distributeColumns, PLACEHOLDER_RATIO } from '@/lib/masonry';
import ArtworkLightbox from '@/components/ArtworkLightbox';

const LIGHTBOX_PARAM = 'artwork';
const SKELETON_RATIOS = [0.8, 1.6, 1, 0.8, 1.6, 1];
// First tiles are above the fold at every breakpoint; load them eagerly.
const EAGER_IMAGE_COUNT = 6;

// Column count mirrors Tailwind's sm / lg breakpoints. Server snapshot is a
// single column; the gallery only renders images after a client fetch, so
// there is nothing to mismatch on hydration.
const COLUMN_QUERIES = ['(min-width: 1024px)', '(min-width: 640px)'] as const;

function subscribeToColumns(callback: () => void) {
  const lists = COLUMN_QUERIES.map((query) => window.matchMedia(query));
  lists.forEach((list) => list.addEventListener('change', callback));
  return () => lists.forEach((list) => list.removeEventListener('change', callback));
}

function getColumnCount() {
  if (window.matchMedia(COLUMN_QUERIES[0]).matches) return 3;
  if (window.matchMedia(COLUMN_QUERIES[1]).matches) return 2;
  return 1;
}

function useColumnCount() {
  return useSyncExternalStore(subscribeToColumns, getColumnCount, () => 1);
}

function readLightboxIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(LIGHTBOX_PARAM);
}

function lightboxUrl(id: string | null): string {
  const params = new URLSearchParams(window.location.search);
  if (id) params.set(LIGHTBOX_PARAM, id);
  else params.delete(LIGHTBOX_PARAM);
  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ''}`;
}

export default function ArtGallery() {
  const { images, projects, fetchImages, selectedProjectId, hasMoreImages } = useGallery();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [learnedRatios, setLearnedRatios] = useState<Record<string, number>>({});
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const pushedHistoryEntry = useRef(false);
  const lightboxIdRef = useRef<string | null>(null);
  const columnCount = useColumnCount();

  useEffect(() => {
    lightboxIdRef.current = lightboxId;
  }, [lightboxId]);

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

  const ratioFor = useCallback(
    (image: ArtworkImage): number | null =>
      aspectRatioOf(image.width, image.height) ?? learnedRatios[image.id] ?? null,
    [learnedRatios]
  );

  const learnRatio = useCallback((image: ArtworkImage, naturalWidth: number, naturalHeight: number) => {
    if (aspectRatioOf(image.width, image.height) !== null) return;
    const ratio = aspectRatioOf(naturalWidth, naturalHeight);
    if (ratio === null) return;
    setLearnedRatios((prev) => (prev[image.id] === ratio ? prev : { ...prev, [image.id]: ratio }));
  }, []);

  const projectNameFor = useCallback(
    (image: ArtworkImage): string | null => {
      const projectId = image.metadata.projectId;
      if (!projectId) return null;
      return projects.find((project) => project.id === projectId)?.name ?? null;
    },
    [projects]
  );

  const columns = useMemo(
    () => distributeColumns(images, columnCount, (image) => ratioFor(image) ?? PLACEHOLDER_RATIO),
    [images, columnCount, ratioFor]
  );

  // Ids come back from the API as numbers but arrive from the URL as strings;
  // compare them as strings throughout.
  const lightboxIndex = lightboxId === null ? -1 : images.findIndex((image) => String(image.id) === lightboxId);

  // --- Lightbox <-> URL sync -------------------------------------------------
  // Opening pushes ?artwork=<id> onto the history stack (pathname stays
  // /gallery so the 3D zone does not change); prev/next replace it; closing
  // pops the entry we pushed. Back/forward and deep links are handled via
  // popstate and an initial read of the query string.

  const openLightbox = useCallback((rawId: string | number) => {
    const id = String(rawId);
    const current = lightboxIdRef.current;
    if (current === null) {
      window.history.pushState({ ...window.history.state, artworkLightbox: true }, '', lightboxUrl(id));
      pushedHistoryEntry.current = true;
    } else if (current !== id) {
      window.history.replaceState(window.history.state, '', lightboxUrl(id));
    }
    lightboxIdRef.current = id;
    setLightboxId(id);
  }, []);

  const closeLightbox = useCallback(() => {
    if (pushedHistoryEntry.current) {
      pushedHistoryEntry.current = false;
      window.history.back();
      return;
    }
    window.history.replaceState(window.history.state, '', lightboxUrl(null));
    setLightboxId(null);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      pushedHistoryEntry.current = false;
      setLightboxId(readLightboxIdFromUrl());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Deep link: open the lightbox once the requested artwork is in the list.
  useEffect(() => {
    if (isLoading || lightboxId !== null) return;
    const requested = readLightboxIdFromUrl();
    if (requested && images.some((image) => String(image.id) === requested)) {
      setLightboxId(requested);
    }
  }, [images, isLoading, lightboxId]);

  // If the active artwork disappears (filter change), drop the lightbox.
  useEffect(() => {
    if (lightboxId !== null && !isLoading && lightboxIndex === -1) {
      pushedHistoryEntry.current = false;
      window.history.replaceState(window.history.state, '', lightboxUrl(null));
      setLightboxId(null);
    }
  }, [isLoading, lightboxId, lightboxIndex]);

  const handleTileClick = (event: React.MouseEvent<HTMLAnchorElement>, id: string | number) => {
    // Let modified clicks (new tab, etc.) follow the real /artwork/[id] link.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    openLightbox(id);
  };

  return (
    <div className="relative min-h-screen">
      <main className="pb-16">
        {isLoading ? (
          <div className="flex items-start gap-3 sm:gap-4" aria-busy="true" aria-label="Loading artwork">
            {distributeColumns(SKELETON_RATIOS, columnCount, (ratio) => ratio).map((column, columnIndex) => (
              <div key={columnIndex} className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-4">
                {column.map((ratio, index) => (
                  <div
                    key={index}
                    className="w-full animate-pulse rounded-md border border-zinc-800 bg-zinc-900"
                    style={{ aspectRatio: String(ratio) }}
                  />
                ))}
              </div>
            ))}
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
            <div className="flex items-start gap-3 sm:gap-4">
              {columns.map((column, columnIndex) => (
                <div key={columnIndex} className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-4">
                  {column.map((image) => {
                    const knownRatio = ratioFor(image);
                    const isAboveFold = images.indexOf(image) < EAGER_IMAGE_COUNT;
                    return (
                      <Link
                        key={image.id}
                        href={`/artwork/${image.id}`}
                        onClick={(event) => handleTileClick(event, image.id)}
                        aria-label={image.metadata.title}
                        className="group relative block w-full overflow-hidden rounded-md border border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      >
                        <div
                          className="relative w-full transition-[aspect-ratio] duration-200"
                          style={{ aspectRatio: String(knownRatio ?? PLACEHOLDER_RATIO) }}
                        >
                          <Image
                            src={image.url}
                            alt={image.metadata.title}
                            fill
                            className={`${knownRatio ? 'object-cover' : 'object-contain'} transition-transform duration-300 group-hover:scale-[1.02]`}
                            sizes="(max-width: 640px) 95vw, (max-width: 1024px) 45vw, 360px"
                            loading={isAboveFold ? 'eager' : 'lazy'}
                            onLoad={(event) => {
                              const target = event.currentTarget;
                              learnRatio(image, target.naturalWidth, target.naturalHeight);
                            }}
                          />

                          {/* Hover overlay (pointer devices) */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:hidden">
                            <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                              <h3 className="text-sm font-medium text-white">{image.metadata.title}</h3>
                              {image.metadata.description && (
                                <p className="mt-1 line-clamp-2 text-xs text-white/75">{image.metadata.description}</p>
                              )}
                              {image.metadata.tags && image.metadata.tags.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {image.metadata.tags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="rounded-full border border-white/20 bg-black/50 px-2 py-0.5 text-[10px] text-white/90"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Always-visible caption (touch devices) */}
                        <div className="hidden border-t border-zinc-800 px-3 py-2 [@media(hover:none)]:block">
                          <p className="truncate text-xs text-zinc-300">{image.metadata.title}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
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

      {lightboxIndex >= 0 && (
        <ArtworkLightbox
          images={images}
          index={lightboxIndex}
          ratioFor={ratioFor}
          projectNameFor={projectNameFor}
          onClose={closeLightbox}
          onNavigate={(index) => {
            const next = images[index];
            if (next) openLightbox(next.id);
          }}
          onImageLoad={learnRatio}
        />
      )}
    </div>
  );
}
