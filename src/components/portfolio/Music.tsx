'use client';

import type { PortfolioTrack } from '@/content/portfolio';
import { formatDuration as formatTime } from '@/content/music';
import { useTrackPlayer } from '@/components/music/useTrackPlayer';
import SectionHeading from './SectionHeading';
import Reveal from './Reveal';

interface MusicProps {
  index: string;
  tracks: PortfolioTrack[];
}

/** Minimal audio list: one track plays at a time, progress shown as a hairline. */
export default function Music({ index, tracks }: MusicProps) {
  const { audioRef, current, playing, progress, elapsed, toggle } = useTrackPlayer(tracks);

  return (
    <section id="music" aria-labelledby="music-heading" className="scroll-mt-14 sm:scroll-mt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <SectionHeading id="music-heading" index={index} title="Music" meta={`${tracks.length} tracks`} />
        </Reveal>
        <Reveal delay={80}>
          <audio ref={audioRef} preload="none" />
          <ul className="mt-8 divide-y divide-white/10 sm:mt-12">
            {tracks.map((track, i) => {
              const active = current === i;
              return (
                <li key={track.src} className="relative">
                  <button
                    type="button"
                    onClick={() => toggle(i)}
                    aria-pressed={active && playing}
                    className="group flex w-full items-center gap-5 py-5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:gap-8"
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/20 text-white transition-colors group-hover:border-white"
                    >
                      {active && playing ? (
                        <span className="flex gap-1">
                          <span className="block h-3 w-[3px] bg-white" />
                          <span className="block h-3 w-[3px] bg-white" />
                        </span>
                      ) : (
                        <span className="ml-0.5 block h-0 w-0 border-y-[6px] border-l-[10px] border-y-transparent border-l-white" />
                      )}
                    </span>
                    <span className="flex-1 truncate text-base text-white sm:text-lg">{track.title}</span>
                    <span className="font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-zinc-500">
                      {active ? `${formatTime(elapsed)} / ` : ''}
                      {track.duration ?? ''}
                    </span>
                    <span className="sr-only">{active && playing ? 'Pause' : 'Play'}</span>
                  </button>
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-0 h-px bg-white"
                      style={{ width: `${progress * 100}%` }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
