'use client';

import { formatDuration, type Track } from '@/content/music';
import { useTrackPlayer } from './useTrackPlayer';

interface TrackListProps {
  tracks: Track[];
}

/**
 * The /music track list. One hidden <audio> element, one track at a time;
 * each row is a play/pause button with a hairline progress bar underneath.
 */
export default function TrackList({ tracks }: TrackListProps) {
  const { audioRef, current, playing, progress, elapsed, toggle } = useTrackPlayer(tracks);

  return (
    <>
      <audio ref={audioRef} preload="none" />
      <ol className="divide-y divide-white/10 border-y border-white/10" aria-label="Tracks">
        {tracks.map((track, i) => {
          const active = current === i;
          const isPlaying = active && playing;
          return (
            <li key={track.slug} className="relative">
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-label={`${isPlaying ? 'Pause' : 'Play'} ${track.title}`}
                aria-pressed={isPlaying}
                className="group flex w-full items-center gap-4 py-5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white sm:gap-6 sm:py-6"
              >
                <span
                  aria-hidden="true"
                  className={`flex h-10 w-10 shrink-0 items-center justify-center border transition-colors group-hover:border-white ${
                    active ? 'border-white' : 'border-white/20'
                  }`}
                >
                  {isPlaying ? (
                    <span className="flex gap-1">
                      <span className="block h-3 w-[3px] bg-white" />
                      <span className="block h-3 w-[3px] bg-white" />
                    </span>
                  ) : (
                    <span className="ml-0.5 block h-0 w-0 border-y-[6px] border-l-[10px] border-y-transparent border-l-white" />
                  )}
                </span>

                <span
                  aria-hidden="true"
                  className="hidden w-6 font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-zinc-600 sm:block"
                >
                  {(i + 1).toString().padStart(2, '0')}
                </span>

                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-base sm:text-lg ${active ? 'text-white' : 'text-zinc-100'}`}>
                    {track.title}
                  </span>
                  <span className="mt-1 block text-xs text-zinc-500 sm:hidden">{track.year}</span>
                </span>

                <span className="hidden text-sm text-zinc-500 sm:block">{track.year}</span>

                <span className="w-[5.5rem] text-right font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-zinc-500 sm:w-24">
                  {active && (
                    <>
                      <span className="text-zinc-300">{formatDuration(elapsed)}</span>
                      <span className="text-zinc-600"> / </span>
                    </>
                  )}
                  {formatDuration(track.duration)}
                </span>
              </button>

              {/* Progress hairline: sits on the row's bottom divider so it reads as the line filling in. */}
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-[-1px] left-0 h-px bg-white"
                  style={{ width: `${progress * 100}%` }}
                />
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}
