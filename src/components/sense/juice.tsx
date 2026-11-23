'use client';

import { useEffect, useRef, useState } from 'react';

/** A number that counts up to its value, and on from there when the value changes. */
export function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = from.current, began = performance.now();
    const length = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 700;
    let frame = requestAnimationFrame(function step(now) {
      const k = length ? Math.min(1, (now - began) / length) : 1;
      setShown(Math.round(start + (value - start) * (1 - (1 - k) ** 3)));
      if (k < 1) frame = requestAnimationFrame(step); else from.current = value;
    });
    return () => { cancelAnimationFrame(frame); from.current = value; };
  }, [value]);
  return <>{shown}</>;
}

const SOUND = 'sense-sound';
export function soundOn() {
  try { return localStorage.getItem(SOUND) !== 'off'; } catch { return true; }
}
export function setSound(on: boolean) {
  try { localStorage.setItem(SOUND, on ? 'on' : 'off'); } catch { /* private window */ }
}

let audio: AudioContext | null = null;
/**
 * A short rising chime, made in the browser (no sound file). It starts a semitone higher for each day
 * of the streak, up to an octave, so a longer chain sounds brighter.
 */
export function chime(streak = 1) {
  if (!soundOn()) return;
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') audio.resume();
    const ctx = audio;
    const base = 392 * 2 ** (Math.min(Math.max(streak, 1) - 1, 12) / 12);
    [0, 4, 7, 12].forEach((semitones, i) => {
      const tone = ctx.createOscillator(), gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.075;
      tone.type = 'triangle';
      tone.frequency.value = base * 2 ** (semitones / 12);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.13, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.55);
      tone.connect(gain).connect(ctx.destination);
      tone.start(start);
      tone.stop(start + 0.6);
    });
  } catch { /* no audio here: the visual still plays */ }
}
