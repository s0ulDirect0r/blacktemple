'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface TrackPlayer {
  /** Attach to the single, hidden <audio preload="none"> element. */
  audioRef: React.RefObject<HTMLAudioElement | null>;
  /** Index of the loaded track, or null before anything has been played. */
  current: number | null;
  playing: boolean;
  /** 0..1 through the current track. */
  progress: number;
  /** Seconds into the current track. */
  elapsed: number;
  /** Play track i; pause it if it is already playing; resume it if paused. */
  toggle: (index: number) => void;
}

/**
 * One track at a time through a single <audio> element. Play/pause state is
 * read back from the element's own events, so OS media keys and a network
 * failure mid-play keep the UI honest.
 */
export function useTrackPlayer(tracks: { src: string }[]): TrackPlayer {
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
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
      setElapsed(0);
    };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnd);
    };
  }, []);

  const toggle = useCallback(
    (index: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      // play() rejects when autoplay is blocked or the file fails to load;
      // the 'pause' listener (or the absence of 'play') already leaves the
      // UI in the stopped state, so the rejection only needs swallowing.
      const play = () => audio.play().catch(() => setPlaying(false));

      if (current === index) {
        if (audio.paused) play();
        else audio.pause();
        return;
      }
      audio.src = tracks[index].src;
      setCurrent(index);
      setProgress(0);
      setElapsed(0);
      play();
    },
    [current, tracks]
  );

  return { audioRef, current, playing, progress, elapsed, toggle };
}
