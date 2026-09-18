'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { PortfolioVideo } from '@/content/portfolio';

function ExpandedVideo({ video, title, onClose }: { video: PortfolioVideo; title: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const playerRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current!;
    const player = playerRef.current!;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    player.play().catch(() => {});
    return () => {
      player.pause();
      document.body.style.overflow = overflow;
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-label={`${title} ${video.label ?? 'gameplay'} video`}
      onClose={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) dialogRef.current?.close(); }}
      className="m-auto w-[min(1200px,96vw)] max-w-none overflow-visible border border-zinc-700 bg-black p-0 text-white backdrop:bg-black/90"
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <p className="text-sm">{title} · {video.label ?? 'Gameplay'}</p>
        <button type="button" autoFocus onClick={() => dialogRef.current?.close()} className="min-h-11 px-3 text-sm text-zinc-300 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" aria-label="Close video">Close ×</button>
      </div>
      <video ref={playerRef} src={video.src} poster={video.poster} loop={video.loop} controls playsInline preload="metadata" className="max-h-[calc(90dvh-80px)] w-full bg-black object-contain" />
    </dialog>, document.body
  );
}

export default function VideoPreview({ video, title, children, aspectRatio, className = '' }: {
  video: PortfolioVideo;
  title: string;
  children?: ReactNode;
  aspectRatio?: string;
  className?: string;
}) {
  const previewRef = useRef<HTMLVideoElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const play = () => {
    if (!open && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      previewRef.current?.play().catch(() => {});
    }
  };
  const stop = () => {
    const video = previewRef.current;
    if (video) { video.pause(); video.currentTime = 0; }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Watch ${title} ${video.label ?? 'gameplay'} in a larger player`}
        aria-haspopup="dialog"
        onMouseEnter={play}
        onMouseLeave={stop}
        onFocus={play}
        onBlur={stop}
        onClick={() => { stop(); setOpen(true); }}
        className={`group block w-full overflow-hidden bg-black text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${className}`}
      >
        <div className="relative" style={{ aspectRatio: aspectRatio ?? `${video.width} / ${video.height}` }}>
          <video ref={previewRef} src={video.previewSrc ?? video.src} poster={video.poster} muted loop playsInline preload="none" aria-hidden="true" className="absolute inset-0 h-full w-full object-contain" />
          <span className="absolute bottom-3 right-3 rounded bg-black/80 px-3 py-2 text-xs text-white">Watch larger ↗</span>
        </div>
        {children}
      </button>
      {open && <ExpandedVideo video={video} title={title} onClose={() => { setOpen(false); triggerRef.current?.focus({ preventScroll: true }); }} />}
    </>
  );
}
