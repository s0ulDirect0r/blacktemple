'use client';

import { useEffect, useRef, useState } from 'react';
import type { PortfolioTrack } from '@/content/portfolio';
import SectionHeading from './SectionHeading';
import Reveal from './Reveal';

interface MusicProps {
  index: string;
  tracks: PortfolioTrack[];
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Minimal audio list: one track plays at a time, progress shown as a hairline. */
export default function Music({ index, tracks }: MusicProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [current, setCurrent] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      setElapsed(audio.currentTime);
      setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
    };
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
      setElapsed(0);
    };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
    };
  }, []);

  const toggle = async (i: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (current === i) {
      if (playing) {
        audio.pause();
        setPlaying(false);
      } else {
        await audio.play();
        setPlaying(true);
      }
      return;
    }
    audio.src = tracks[i].src;
    setCurrent(i);
    setProgress(0);
    setElapsed(0);
    await audio.play();
    setPlaying(true);
  };

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
