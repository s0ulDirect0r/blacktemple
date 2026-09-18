import Image from 'next/image';
import type { CabinetTile, PortfolioHero } from '@/content/portfolio';
import CabinetTileView from './CabinetTile';

interface HeroProps {
  hero: PortfolioHero;
  cabinet: CabinetTile[];
}

/**
 * The first screen: the name, one sentence, and one piece per medium, so a
 * reviewer sees the whole practice in the first five seconds. No single
 * painting is asked to carry the page.
 */
export default function Hero({ hero, cabinet }: HeroProps) {
  return (
    <section id="top" aria-labelledby="hero-name" className="bg-black">
      <div className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 sm:pt-20 lg:pt-24">
        <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_240px] lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-16">
          <div>
            <h1
              id="hero-name"
              className="font-pixel text-[26px] leading-[1.3] text-white sm:text-4xl sm:leading-[1.25] lg:text-5xl lg:leading-[1.2]"
            >
              {hero.name}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-200 sm:text-xl sm:leading-relaxed lg:text-2xl lg:leading-relaxed">
              {hero.line}
            </p>
          </div>
          <figure className="w-full max-w-[240px] md:max-w-none">
            <a href="/images/portfolio/paintings/the-vow-sigil.jpg" className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white" aria-label="View The Vow Sigil at full size">
              <Image
                src="/images/portfolio/paintings/the-vow-sigil.jpg"
                alt="The Vow Sigil"
                width={4000}
                height={4000}
                sizes="(min-width: 1024px) 280px, 240px"
                priority
                className="h-auto w-full"
              />
            </a>
            <figcaption className="mt-3 text-xs leading-relaxed text-zinc-400">
              the vow sigil — drawn when “mystery &amp; dopeness” landed in my heart.
            </figcaption>
          </figure>
        </div>

        <p id="hero-card-hint" className="mt-10 text-sm text-zinc-400 sm:mt-14">
          <span className="hidden [@media(hover:hover)]:inline motion-reduce:hidden">hover for a preview. </span>
          select a card to explore.
        </p>
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3" aria-label="Featured work" aria-describedby="hero-card-hint">
          {cabinet.map((tile) => (
            <li key={tile.title}>
              <CabinetTileView tile={tile} />
            </li>
          ))}
        </ul>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:py-28">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
          <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500 sm:text-xs lg:col-span-3 lg:pt-2">
            Artist statement
          </p>
          <div className="space-y-6 lg:col-span-8 lg:col-start-5">
            <p className="text-xl leading-relaxed text-zinc-100 sm:text-2xl sm:leading-relaxed">
              {hero.statement[0]}
            </p>
            {hero.statement.length > 1 && (
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md border border-zinc-600 bg-zinc-900 px-5 py-4 text-white transition-colors hover:border-zinc-400 hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none [&::-webkit-details-marker]:hidden">
                  <span>
                    <span className="block text-base font-semibold sm:text-lg">read my full artist statement</span>
                    <span className="mt-1 block text-sm text-zinc-300 group-open:hidden">select to expand</span>
                    <span className="mt-1 hidden text-sm text-zinc-300 group-open:block">select to collapse</span>
                  </span>
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none">
                    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </summary>
                <div className="mt-6 space-y-6">
                  {hero.statement.slice(1).map((paragraph, i) => (
                    <p key={i} className="text-base leading-relaxed text-zinc-300 sm:text-lg sm:leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
