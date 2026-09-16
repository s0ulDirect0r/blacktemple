import Image from 'next/image';
import Link from 'next/link';
import type { PortfolioPainting } from '@/lib/portfolio';
import SectionHeading from './SectionHeading';
import Reveal from './Reveal';

interface PaintingsProps {
  index: string;
  paintings: PortfolioPainting[];
  /** One-line "Also:" links after the grid, e.g. to the Spidernomicon. */
  extras?: { label: string; href: string }[];
}

export default function Paintings({ index, paintings, extras = [] }: PaintingsProps) {
  return (
    <section id="paintings" aria-labelledby="paintings-heading" className="scroll-mt-14 sm:scroll-mt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <SectionHeading id="paintings-heading" index={index} title="Paintings" meta={`${paintings.length} recent, of 200+`} />
        </Reveal>

        {paintings.length === 0 ? (
          <p className="py-16 text-zinc-500">The gallery is temporarily unavailable.</p>
        ) : (
          <Reveal delay={80}>
            <ul className="mt-8 columns-2 gap-3 sm:mt-12 sm:gap-5 md:columns-3 xl:columns-4">
              {paintings.map((painting, i) => (
                <li key={painting.id} className="mb-3 break-inside-avoid sm:mb-5">
                  <Link
                    href={`/artwork/${painting.id}`}
                    className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                  >
                    <figure>
                      <div className="relative overflow-hidden bg-zinc-900">
                        <Image
                          src={painting.url}
                          alt={painting.title}
                          width={painting.width}
                          height={painting.height}
                          sizes="(max-width: 767px) 50vw, (max-width: 1279px) 33vw, 25vw"
                          loading={i < 4 ? 'eager' : 'lazy'}
                          className="h-auto w-full transition-transform duration-700 ease-out group-hover:scale-[1.025] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                        />
                        {/* Desktop: title rises on hover */}
                        <figcaption
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-0 bottom-0 hidden translate-y-2 bg-gradient-to-t from-black/85 to-transparent px-4 pb-4 pt-10 text-sm text-white opacity-0 transition-[opacity,transform] duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 md:block"
                        >
                          {painting.title}
                        </figcaption>
                      </div>
                      {/* Mobile: caption always visible */}
                      <figcaption className="mt-1.5 truncate text-[10px] uppercase tracking-[0.12em] text-zinc-500 md:sr-only">
                        {painting.title}
                      </figcaption>
                    </figure>
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        )}

        {extras.length > 0 && (
          <Reveal>
            <ul className="mt-10 space-y-2 text-base text-zinc-400 sm:mt-14 sm:text-lg">
              {extras.map((extra) => (
                <li key={extra.href}>
                  Also:{' '}
                  <Link
                    href={extra.href}
                    className="text-white underline decoration-zinc-600 underline-offset-[6px] transition-colors hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                  >
                    {extra.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        )}
      </div>
    </section>
  );
}
