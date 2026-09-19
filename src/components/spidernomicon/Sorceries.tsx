'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { tweetUrl, type Sorcery } from '@/content/spidernomicon';
import { formatDate } from './format';

interface SorceriesProps {
  sorceries: Sorcery[];
}

/** Short videos animating the runes. Renders nothing until the list is filled. */
export default function Sorceries({ sorceries }: SorceriesProps) {
  // Only one sorcery plays at a time.
  const [playing, setPlaying] = useState<string | null>(null);

  if (sorceries.length === 0) return null;

  return (
    <section id="sorceries" aria-labelledby="sorceries-heading" className="mt-24 sm:mt-32">
      <div className="flex items-end gap-4 border-b border-white/10 pb-5 sm:gap-6">
        <h2 id="sorceries-heading" className="font-pixel text-base leading-none text-white sm:text-xl">
          Sorceries
        </h2>
        <span className="ml-auto text-xs leading-none tracking-wide text-zinc-500 sm:text-sm">
          {sorceries.length} videos · 2022–23
        </span>
      </div>
      <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
        After the hundredth rune the runes were combined and set in motion. Sound on for some of these.
      </p>

      <ul className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {sorceries.map((sorcery) => (
          <SorceryCard
            key={sorcery.src}
            sorcery={sorcery}
            playing={playing === sorcery.src}
            onPlay={() => setPlaying(sorcery.src)}
            onStop={() => setPlaying((current) => (current === sorcery.src ? null : current))}
          />
        ))}
      </ul>
    </section>
  );
}

function SorceryCard({
  sorcery,
  playing,
  onPlay,
  onStop,
}: {
  sorcery: Sorcery;
  playing: boolean;
  onPlay: () => void;
  onStop: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Pause when another card takes over.
  useEffect(() => {
    const video = videoRef.current;
    if (!playing && video && !video.paused) video.pause();
  }, [playing]);

  const start = () => {
    onPlay();
    void videoRef.current?.play();
  };

  return (
    <li>
      <figure>
        <div
          className="relative bg-black ring-1 ring-white/[0.08]"
          style={{ aspectRatio: `${sorcery.width} / ${sorcery.height}` }}
        >
          <video
            ref={videoRef}
            src={sorcery.src}
            poster={playing ? sorcery.poster : undefined}
            preload="none"
            playsInline
            controls={playing}
            onPlay={onPlay}
            onPause={onStop}
            onEnded={onStop}
            className="absolute inset-0 h-full w-full object-contain"
          />
          {!playing && (
            <button
              type="button"
              onClick={start}
              aria-label={`Play ${sorcery.title}`}
              className="group absolute inset-0 flex items-end justify-start p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {sorcery.poster && (
                <Image
                  src={sorcery.poster}
                  alt=""
                  fill
                  sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
                  className="object-contain transition-opacity duration-300 group-hover:opacity-80 motion-reduce:transition-none"
                />
              )}
              <span className="font-pixel relative flex h-9 w-9 items-center justify-center bg-black/70 text-[10px] text-white ring-1 ring-white/30 transition-[box-shadow] group-hover:ring-white motion-reduce:transition-none">
                ▶
              </span>
            </button>
          )}
        </div>
        <figcaption className="mt-3">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-sm text-white sm:text-base">{sorcery.title}</p>
            <time dateTime={sorcery.date} className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              {formatDate(sorcery.date)}
            </time>
          </div>
          <p className="mt-2 line-clamp-4 whitespace-pre-line text-xs leading-relaxed text-zinc-400">{sorcery.caption}</p>
          <a
            href={tweetUrl(sorcery.tweetId)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-[10px] uppercase tracking-[0.18em] text-zinc-600 transition-colors hover:text-white focus-visible:text-white focus-visible:outline-none"
          >
            Original on X <span aria-hidden="true">↗</span>
          </a>
        </figcaption>
      </figure>
    </li>
  );
}
