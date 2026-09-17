'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { CabinetTile } from '@/content/portfolio';

const BARS = [18, 34, 26, 44, 22, 38, 16, 30, 40, 20, 28, 36];

export default function CabinetTileView({ tile }: { tile: CabinetTile }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const play = () => {
    const v = videoRef.current;
    if (!v) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    v.play().catch(() => {});
  };
  const stop = () => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
  };

  return (
    <Link
      href={tile.href}
      className="group block overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 transition-colors hover:border-zinc-600 focus-visible:border-zinc-500 focus-visible:outline-none"
      onMouseEnter={play}
      onMouseLeave={stop}
      onFocus={play}
      onBlur={stop}
    >
      <div className="relative aspect-[16/10] w-full bg-black">
        {tile.image && tile.fit === 'contain' ? (
          // A whole object on a shelf (a book cover), not a crop.
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 py-3">
            <div
              className="relative h-full shadow-[6px_8px_24px_rgba(0,0,0,0.7)] transition-transform duration-300 group-hover:-translate-y-0.5"
              style={{ aspectRatio: `${tile.image.width} / ${tile.image.height}` }}
            >
              <Image
                src={tile.image.src}
                alt={tile.title}
                fill
                sizes="(min-width: 1024px) 200px, 30vw"
                className="object-cover"
              />
            </div>
          </div>
        ) : tile.image ? (
          <Image
            src={tile.image.src}
            alt={tile.title}
            fill
            sizes="(min-width: 1024px) 400px, 50vw"
            className="object-cover transition-opacity duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center gap-[3px] px-8" aria-hidden="true">
            {BARS.map((h, i) => (
              <span key={i} className="w-1 bg-fuchsia-500/90" style={{ height: `${h}%` }} />
            ))}
          </div>
        )}
        {tile.video && (
          <video
            ref={videoRef}
            src={tile.video}
            muted
            loop
            playsInline
            preload="none"
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:hidden"
          />
        )}
      </div>
      <div className="flex flex-col gap-0.5 px-3 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <span className="text-sm text-zinc-100 sm:truncate">{tile.title}</span>
        <span className="text-[11px] text-zinc-500 sm:shrink-0">{tile.meta}</span>
      </div>
    </Link>
  );
}
