import type { Metadata } from 'next';
import { runes, sorceries, THREAD_URL } from '@/content/spidernomicon';
import Spidernomicon from '@/components/spidernomicon/Spidernomicon';

const TITLE = 'The Spidernomicon';
const DESCRIPTION =
  'The spiderscript lexicon: 100 invented runes drawn by Matthew D. Huff (anansi) in 2022, each with its name and meaning, plus the Sorceries that set them in motion.';

const first = runes[0]?.images[0];

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    images: first ? [{ url: first.url, width: first.width, height: first.height, alt: `Rune 1, ${runes[0].name}` }] : undefined,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: first ? [first.url] : undefined,
  },
};

export default function SpidernomiconPage() {
  return (
    <div className="min-h-screen bg-black font-[family-name:var(--font-geist-sans)] text-zinc-100 antialiased">
      <main className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 sm:pb-32">
        {/* Opening */}
        <section aria-labelledby="spidernomicon-title" className="pb-10 pt-20 sm:pb-16 sm:pt-32 lg:pt-40">
          <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500 sm:text-xs">Spiderscript · 2022</p>
          <h1
            id="spidernomicon-title"
            className="font-pixel mt-5 text-[20px] leading-[1.4] text-white sm:text-3xl sm:leading-[1.35] lg:text-5xl lg:leading-[1.25]"
          >
            The Spidernomicon
          </h1>
          <p className="mt-5 text-sm text-zinc-400 sm:mt-6 sm:text-lg">the spiderscript lexicon · 100 runes · 2022</p>

          <div className="mt-10 grid gap-6 sm:mt-14 lg:grid-cols-12 lg:gap-12">
            <p className="max-w-2xl text-lg leading-relaxed text-zinc-200 sm:text-xl sm:leading-relaxed lg:col-span-8">
              “A collection of 100 Spiderscript Runes,” posted one at a time as a thread on Twitter between May and
              December 2022. The first rune is for the script itself: “twisting, branching, wavy, and a little random.”
            </p>
            <p className="text-sm leading-relaxed text-zinc-500 lg:col-span-4 lg:pt-1">
              Open any rune to read it. Arrow keys move through the lexicon; Cast opens one at random.
            </p>
          </div>
        </section>

        <Spidernomicon runes={runes} sorceries={sorceries} />

        <footer className="mt-24 border-t border-white/10 pt-8 text-xs text-zinc-500 sm:mt-32">
          <p>
            Drawn and written by Matthew D. Huff, as anansi. Originally{' '}
            <a
              href={THREAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-300 underline decoration-zinc-700 underline-offset-4 transition-colors hover:text-white hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              a thread on X <span aria-hidden="true">↗</span>
            </a>
            , 8 May – 25 December 2022.
          </p>
        </footer>
      </main>
    </div>
  );
}
