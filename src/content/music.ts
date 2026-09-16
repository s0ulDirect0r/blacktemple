/**
 * Original music. The audio files live in Vercel Blob under music/<slug>.m4a;
 * upload or refresh them with `npx tsx scripts/upload-music.ts --dir <folder>`.
 *
 * Used by the standalone /music page and the Music section of /portfolio.
 */

export interface Track {
  title: string;
  slug: string;
  /** Public audio URL (AAC in an .m4a container). */
  src: string;
  /** Length in seconds. */
  duration: number;
  year: number;
}

const BLOB = 'https://zp7hauqhmxup1nll.public.blob.vercel-storage.com/music';

export const tracks: Track[] = [
  { title: 'Find the Way', slug: 'find-the-way', src: `${BLOB}/find-the-way.m4a`, duration: 128, year: 2025 },
  { title: 'Synthtrap One', slug: 'synthtrap-one', src: `${BLOB}/synthtrap-one.m4a`, duration: 110, year: 2025 },
  { title: 'Voidsong', slug: 'voidsong', src: `${BLOB}/voidsong.m4a`, duration: 85, year: 2025 },
  { title: 'Voice and Chill', slug: 'voice-and-chill', src: `${BLOB}/voice-and-chill.m4a`, duration: 85, year: 2025 },
  { title: 'Dopeness', slug: 'dopeness', src: `${BLOB}/dopeness.m4a`, duration: 77, year: 2025 },
  { title: 'Bass Song', slug: 'bass-song', src: `${BLOB}/bass-song.m4a`, duration: 96, year: 2024 },
];

/** 128 -> "2:08". Non-finite input (audio metadata not loaded yet) shows as "0:00". */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
