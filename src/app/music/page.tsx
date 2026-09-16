import type { Metadata } from 'next';
import Link from 'next/link';
import { tracks } from '@/content/music';
import TrackList from '@/components/music/TrackList';

const DESCRIPTION = 'Six original tracks by Matthew D. Huff, made in GarageBand between 2024 and 2025.';

export function generateMetadata(): Metadata {
  return {
    title: 'Sound',
    description: DESCRIPTION,
    openGraph: { title: 'Sound', description: DESCRIPTION, type: 'website' },
  };
}

/** Standalone page (no 3D scene, see LayoutContent): a plain list of tracks. */
export default function MusicPage() {
  return (
    <div className="min-h-screen bg-black font-[family-name:var(--font-geist-sans)] text-zinc-100 antialiased">
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-8 sm:px-6 sm:pt-10">
        <nav aria-label="Site">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-zinc-500 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:text-xs"
          >
            <span aria-hidden="true">←</span>
            Back to the temple
          </Link>
        </nav>

        <main className="mt-16 sm:mt-24">
          <header>
            <h1 className="font-pixel text-2xl leading-none text-white sm:text-4xl lg:text-5xl">Sound</h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-400 sm:mt-8 sm:text-lg">
              Six tracks made in GarageBand between 2024 and 2025.
            </p>
          </header>

          <div className="mt-10 sm:mt-14">
            <TrackList tracks={tracks} />
          </div>
        </main>
      </div>
    </div>
  );
}
