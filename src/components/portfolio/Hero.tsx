import Image from 'next/image';
import Link from 'next/link';
import type { PortfolioHero } from '@/content/portfolio';
import type { PortfolioPainting } from '@/lib/portfolio';

interface HeroProps {
  hero: PortfolioHero;
  artwork: PortfolioPainting | null;
}

export default function Hero({ hero, artwork }: HeroProps) {
  const year = artwork ? new Date(artwork.createdAt).getFullYear() : null;

  return (
    <section id="top" aria-labelledby="hero-name">
      <div className="relative min-h-[560px] w-full h-[100svh]">
        {artwork ? (
          <Image
            src={artwork.url}
            alt={artwork.title}
            fill
            priority
            fetchPriority="high"
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-zinc-950" />
        )}

        {/* Legibility: a soft floor for the text, a faint ceiling for the nav */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black via-black/55 via-35% to-black/5"
        />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />

        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16 lg:pb-20">
            <p className="mb-5 text-[11px] uppercase tracking-[0.22em] text-zinc-400 sm:text-xs">
              Portfolio · {hero.location}
            </p>
            <h1
              id="hero-name"
              className="font-pixel text-[22px] leading-[1.35] text-white sm:text-4xl sm:leading-[1.3] lg:text-5xl lg:leading-[1.25]"
            >
              {hero.name}
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-zinc-200 sm:mt-6 sm:text-lg">
              {hero.role}
            </p>
            {artwork && (
              <p className="mt-8 text-[11px] text-zinc-500 sm:text-xs">
                <Link
                  href={`/artwork/${artwork.id}`}
                  className="underline decoration-zinc-700 underline-offset-4 transition-colors hover:text-zinc-300 hover:decoration-zinc-400"
                >
                  {artwork.title}
                </Link>
                {year && <span>, {year}</span>}
              </p>
            )}
          </div>
        </div>
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
