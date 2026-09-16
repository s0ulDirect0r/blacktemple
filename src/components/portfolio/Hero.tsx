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
        <h1
          id="hero-name"
          className="font-pixel text-[26px] leading-[1.3] text-white sm:text-4xl sm:leading-[1.25] lg:text-5xl lg:leading-[1.2]"
        >
          {hero.name}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-200 sm:text-xl sm:leading-relaxed lg:text-2xl lg:leading-relaxed">
          {hero.line}
        </p>

        <ul className="mt-10 grid grid-cols-2 gap-3 sm:mt-14 sm:gap-4 lg:grid-cols-3" aria-label="One piece per medium">
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
            {hero.statement.map((paragraph, i) => (
              <p
                key={i}
                className={
                  i === 0
                    ? 'text-xl leading-relaxed text-zinc-100 sm:text-2xl sm:leading-relaxed'
                    : 'text-base leading-relaxed text-zinc-400 sm:text-lg sm:leading-relaxed'
                }
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
