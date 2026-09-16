'use client';

import Image from 'next/image';
import Link from 'next/link';
import ArtGallery from '@/components/ArtGallery';
import HorizontalProjectFilter from '@/components/HorizontalProjectFilter';
import { GalleryProvider } from '@/context/GalleryContext';

// Rune 1 of the Spidernomicon (runes[0].images[0] in src/content/spidernomicon.ts).
// The URL is copied here so the gallery bundle does not carry the whole lexicon.
const SPIDERNOMICON_RUNE_URL =
  'https://zp7hauqhmxup1nll.public.blob.vercel-storage.com/spidernomicon/rune-001.jpg';

// A quiet hairline row under the project filter: the Spidernomicon lives under Art.
function SpidernomiconEntry() {
  return (
    <Link
      href="/spidernomicon"
      className="group mb-8 flex items-center justify-center gap-3 border-y border-white/10 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:gap-4"
    >
      <span className="relative h-8 w-8 shrink-0 overflow-hidden bg-black ring-1 ring-white/[0.08] transition-[box-shadow] duration-300 group-hover:ring-white/40 sm:h-9 sm:w-9">
        <Image src={SPIDERNOMICON_RUNE_URL} alt="" fill sizes="36px" className="object-contain" />
      </span>
      <span className="min-w-0">
        <span className="font-pixel block text-[9px] leading-none text-zinc-300 transition-colors group-hover:text-white sm:text-[10px]">
          The Spidernomicon
        </span>
        <span className="mt-1.5 block text-[11px] leading-snug text-zinc-500 sm:text-xs">
          a lexicon of 100 invented runes and six sorceries
        </span>
      </span>
      <span
        aria-hidden="true"
        className="shrink-0 text-sm text-zinc-500 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
      >
        →
      </span>
    </Link>
  );
}

export default function GalleryZoneContent() {
  return (
    <GalleryProvider>
      <h1 className="font-pixel text-lg sm:text-xl md:text-2xl text-center mb-6 text-white">Art</h1>
      <HorizontalProjectFilter />
      <SpidernomiconEntry />
      <ArtGallery />
    </GalleryProvider>
  );
}
