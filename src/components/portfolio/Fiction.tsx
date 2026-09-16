import Image from 'next/image';
import Link from 'next/link';
import type { PortfolioBook, PortfolioStory } from '@/content/portfolio';
import SectionHeading from './SectionHeading';
import Reveal from './Reveal';
import ExternalLink from './ExternalLink';

interface FictionProps {
  index: string;
  book: PortfolioBook;
  stories: PortfolioStory[];
}

export default function Fiction({ index, book, stories }: FictionProps) {
  const excerptParagraphs = book.excerpt
    ? book.excerpt.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    : [];

  return (
    <section id="fiction" aria-labelledby="fiction-heading" className="scroll-mt-14 sm:scroll-mt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <SectionHeading id="fiction-heading" index={index} title="Fiction" meta={stories.length ? 'A novel and stories' : 'A novel'} />
        </Reveal>

        <Reveal delay={80}>
          <article className="mt-10 grid gap-10 sm:mt-14 md:grid-cols-12 md:gap-8 lg:gap-12">
            <div className="md:col-span-4 lg:col-span-3">
              <Image
                src={book.cover.src}
                alt={`${book.title}, cover`}
                width={book.cover.width}
                height={book.cover.height}
                sizes="(max-width: 767px) 60vw, (max-width: 1023px) 33vw, 25vw"
                className="h-auto w-3/5 max-w-[280px] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9)] md:w-full"
              />
            </div>

            <div className="md:col-span-8 lg:col-span-7 lg:col-start-5">
              <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500 sm:text-xs">A novel</p>
              <h3 className="font-pixel mt-4 text-base leading-[1.4] text-white sm:text-xl lg:text-2xl">
                {book.title}
              </h3>

              <div className="mt-6 space-y-5 text-base leading-relaxed text-zinc-300 sm:text-lg sm:leading-relaxed">
                {book.blurb.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>

              {excerptParagraphs.length > 0 && (
                <div className="mt-10 border-l border-white/15 pl-5 sm:pl-7">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500 sm:text-xs">Read an excerpt</p>
                  <blockquote className="mt-4 space-y-4 font-serif text-base italic leading-relaxed text-zinc-200 sm:text-lg">
                    {excerptParagraphs.map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </blockquote>
                </div>
              )}

              <ul className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
                {book.links.map((link) => (
                  <li key={link.href}>
                    <ExternalLink href={link.href} className="text-base sm:text-lg">
                      {link.label}
                    </ExternalLink>
                    {link.note && <p className="mt-1 text-xs text-zinc-500">{link.note}</p>}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </Reveal>

        {stories.length > 0 && (
          <Reveal>
            <div className="mt-16 border-t border-white/10 pt-10 sm:mt-24">
              <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500 sm:text-xs">Short stories</p>
              <ul className="mt-6 divide-y divide-white/10">
                {stories.map((story) => (
                  <li key={story.slug} className="py-6 sm:py-8">
                    <Link
                      href={`/writing/${story.slug}`}
                      className="group grid gap-2 md:grid-cols-12 md:gap-8"
                    >
                      <h4 className="text-lg font-medium text-white transition-colors group-hover:text-zinc-300 sm:text-xl md:col-span-4">
                        {story.title}
                      </h4>
                      <p className="text-base leading-relaxed text-zinc-400 md:col-span-7 md:col-start-6">{story.excerpt}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
