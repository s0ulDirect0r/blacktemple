import Image from 'next/image';
import Link from 'next/link';
import type { PortfolioBook, PortfolioStory } from '@/content/portfolio';
import { getStories } from '@/lib/mdx';
import SectionHeading from './SectionHeading';
import Reveal from './Reveal';
import ExternalLink from './ExternalLink';

interface FictionProps {
  index: string;
  book: PortfolioBook;
  stories: PortfolioStory[];
}

export default function Fiction({ index, book, stories }: FictionProps) {
  const excerpt = book.excerpt && book.excerpt.paragraphs.length > 0 ? book.excerpt : null;
  const storyMetadata = new Map(getStories().map((story) => [story.slug, story]));
  const featuredSlugs = new Set(stories.map((story) => story.slug));
  const moreStories = [...storyMetadata.values()].filter((story) => !featuredSlugs.has(story.slug));
  const illustratedStories = stories.map((story) => ({
    ...story,
    illustration: storyMetadata.get(story.slug),
  }));

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

              {excerpt && (
                <details className="group/excerpt mt-10 border-y border-white/15 py-1">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-base text-white hover:text-zinc-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white [&::-webkit-details-marker]:hidden">
                    <span>Read an excerpt <span className="text-zinc-500">· {excerpt.title}</span></span>
                    <span aria-hidden="true" className="transition-transform group-open/excerpt:rotate-180 motion-reduce:transition-none">⌄</span>
                  </summary>
                  <div className="border-l border-white/15 pb-6 pl-5 sm:pl-7">
                  <blockquote className="mt-4 max-w-[65ch] space-y-4 font-serif text-base leading-relaxed text-zinc-200 sm:text-lg">
                    {excerpt.paragraphs.map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </blockquote>
                  <p className="mt-6 text-sm text-zinc-500">
                    <a
                      href="#book-links"
                      className="underline decoration-zinc-700 underline-offset-4 transition-colors hover:text-zinc-300 hover:decoration-zinc-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                    >
                      Read the book <span aria-hidden="true">↓</span>
                    </a>
                  </p>
                  </div>
                </details>
              )}

              <ul id="book-links" className="mt-10 flex scroll-mt-20 flex-wrap gap-x-10 gap-y-4">
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
                {illustratedStories.map((story) => (
                  <li key={story.slug} className="py-6 sm:py-8">
                    <Link
                      href={`/writing/${story.slug}`}
                      className="group grid items-center gap-5 sm:grid-cols-12 sm:gap-8 lg:gap-12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                    >
                      {story.illustration && (
                        <div className="sm:col-span-5">
                          <Image
                            src={story.illustration.cover}
                            alt={`${story.title}, title illustration`}
                            width={story.illustration.coverWidth}
                            height={story.illustration.coverHeight}
                            sizes="(max-width: 639px) calc(100vw - 32px), (max-width: 1279px) 42vw, 500px"
                            className="h-auto w-full transition-opacity duration-300 group-hover:opacity-90"
                          />
                        </div>
                      )}
                      <div className={story.illustration ? 'sm:col-span-7' : 'sm:col-span-12'}>
                      <h4 className="text-lg font-medium text-white transition-colors group-hover:text-zinc-300 sm:text-xl">
                        {story.title}
                      </h4>
                      <p className="mt-3 text-base leading-relaxed text-zinc-400">{story.excerpt}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              {moreStories.length > 0 && (
                <details className="group/stories mt-8 border-y border-white/15 py-1">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg text-white hover:text-zinc-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white [&::-webkit-details-marker]:hidden">
                    <span>More stories <span className="text-sm text-zinc-500">· {moreStories.length} more to explore</span></span>
                    <span aria-hidden="true" className="transition-transform group-open/stories:rotate-180 motion-reduce:transition-none">⌄</span>
                  </summary>
                  <ul className="grid grid-cols-2 gap-x-5 gap-y-8 pb-8 pt-4 lg:grid-cols-3 lg:gap-x-8">
                    {moreStories.map((story) => (
                      <li key={story.slug}>
                        <Link href={`/writing/${story.slug}`} className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                          <div className="relative aspect-video bg-black">
                            <Image src={story.cover} alt={`${story.title}, title illustration`} fill sizes="(max-width: 1023px) 50vw, 400px" className="object-contain transition-opacity duration-300 group-hover:opacity-90" />
                          </div>
                          <h4 className="mt-3 text-sm font-medium text-white group-hover:text-zinc-300 sm:text-base">{story.title}</h4>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
