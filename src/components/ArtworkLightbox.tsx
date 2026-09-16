'use client';

import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { FiChevronLeft, FiChevronRight, FiX, FiArrowUpRight } from 'react-icons/fi';
import { ArtworkImage } from '@/types/artwork';
import { PLACEHOLDER_RATIO } from '@/lib/masonry';

interface ArtworkLightboxProps {
  images: ArtworkImage[];
  index: number;
  /** Aspect ratio (w / h) for an image, including ratios learned client-side. */
  ratioFor: (image: ArtworkImage) => number | null;
  projectNameFor: (image: ArtworkImage) => string | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onImageLoad?: (image: ArtworkImage, naturalWidth: number, naturalHeight: number) => void;
}

const SWIPE_THRESHOLD = 48;
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function ArtworkLightbox({
  images,
  index,
  ratioFor,
  projectNameFor,
  onClose,
  onNavigate,
  onImageLoad,
}: ArtworkLightboxProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const image = images[index];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  const goPrev = useCallback(() => {
    if (hasPrev) onNavigate(index - 1);
  }, [hasPrev, index, onNavigate]);

  const goNext = useCallback(() => {
    if (hasNext) onNavigate(index + 1);
  }, [hasNext, index, onNavigate]);

  // Keyboard: arrows, escape, and a Tab focus trap.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          goPrev();
          break;
        case 'ArrowRight':
          event.preventDefault();
          goNext();
          break;
        case 'Tab': {
          const dialog = dialogRef.current;
          if (!dialog) return;
          const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          const active = document.activeElement;
          if (event.shiftKey && (active === first || !dialog.contains(active))) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && active === last) {
            event.preventDefault();
            first.focus();
          }
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, onClose]);

  // Body scroll lock + focus management for the lifetime of the dialog.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  const handleTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goNext();
      else goPrev();
    }
  };

  if (!image || typeof document === 'undefined') {
    return null;
  }

  const projectName = projectNameFor(image);
  const neighbours = [images[index - 1], images[index + 1]].filter(Boolean) as ArtworkImage[];

  const renderImage = (item: ArtworkImage, active: boolean) => {
    const ratio = ratioFor(item) ?? PLACEHOLDER_RATIO;
    return (
      <div
        key={item.id}
        aria-hidden={!active}
        className={
          active
            ? 'relative max-h-full'
            : 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 pointer-events-none'
        }
        style={{
          aspectRatio: String(ratio),
          width: `min(100%, calc(var(--lightbox-stage) * ${ratio}))`,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <Image
          src={item.url}
          alt={active ? item.metadata.title : ''}
          fill
          sizes="100vw"
          loading="eager"
          priority={active}
          className="object-contain select-none"
          draggable={false}
          onLoad={(event) => {
            const target = event.currentTarget;
            if (onImageLoad && target.naturalWidth && target.naturalHeight) {
              onImageLoad(item, target.naturalWidth, target.naturalHeight);
            }
          }}
        />
      </div>
    );
  };

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={image.metadata.title}
      className="lightbox-enter fixed inset-0 z-[100] flex flex-col bg-black text-white"
      style={{ ['--lightbox-stage' as string]: 'calc(100dvh - 7.5rem)' }}
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div
        className="flex h-12 shrink-0 items-center justify-between px-3 sm:px-4"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="font-mono text-[11px] tracking-widest text-zinc-500 tabular-nums">
          {String(index + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
        </span>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          aria-label="Close"
        >
          <FiX className="h-5 w-5" />
        </button>
      </div>

      {/* Stage */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 sm:px-14">
        {renderImage(image, true)}
        {neighbours.map((item) => renderImage(item, false))}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            goPrev();
          }}
          disabled={!hasPrev}
          className="absolute left-1 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-800 bg-black/70 text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:left-3 [@media(hover:hover)]:flex"
          aria-label="Previous artwork"
        >
          <FiChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            goNext();
          }}
          disabled={!hasNext}
          className="absolute right-1 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-800 bg-black/70 text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-3 [@media(hover:hover)]:flex"
          aria-label="Next artwork"
        >
          <FiChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Caption */}
      <div
        className="flex h-[4.5rem] shrink-0 items-center justify-between gap-4 px-4 sm:px-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="min-w-0">
          <h2 className="font-pixel truncate text-[11px] sm:text-xs text-white">{image.metadata.title}</h2>
          {projectName && (
            <p className="mt-1 truncate text-xs text-zinc-500">{projectName}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={goPrev}
            disabled={!hasPrev}
            className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 transition-colors hover:text-white disabled:opacity-25 [@media(hover:hover)]:hidden"
            aria-label="Previous artwork"
          >
            <FiChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!hasNext}
            className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 transition-colors hover:text-white disabled:opacity-25 [@media(hover:hover)]:hidden"
            aria-label="Next artwork"
          >
            <FiChevronRight className="h-5 w-5" />
          </button>
          <Link
            href={`/artwork/${image.id}`}
            className="ml-1 inline-flex h-10 items-center gap-1.5 rounded-full border border-zinc-800 px-3 text-xs text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <span className="hidden sm:inline">Open</span>
            <FiArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>,
    document.body
  );
}
