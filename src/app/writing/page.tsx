import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getStories } from '@/lib/mdx';
import StoryMeta from '@/components/writing/StoryMeta';

const DESCRIPTION =
  'Short fiction by Matthew D. Huff: stories, a poem cycle, and two illustrated pieces, first posted as Twitter threads in 2022 under 100 Anansi Stories.';

export function generateMetadata(): Metadata {
  const [first] = getStories();

  return {
    title: 'Writing',
    description: DESCRIPTION,
    openGraph: {
      title: 'Writing · Matthew D. Huff',
      description: DESCRIPTION,
      images: first
        ? [{ url: first.cover, width: first.coverWidth, height: first.coverHeight, alt: first.title }]
        : undefined,
    },
  };
}

export default function WritingPage() {
  const stories = getStories();

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-12 sm:px-6 sm:pb-32 sm:pt-16">
        <h1 className="font-pixel text-lg leading-none text-white sm:text-2xl">Writing</h1>

        <p className="mt-6 max-w-[60ch] text-lg leading-relaxed text-zinc-400 sm:text-xl sm:leading-relaxed">
          In 2022 I posted fourteen tales as Twitter threads under the banner{' '}
          <span className="text-zinc-200">100 Anansi Stories</span>; these are the fiction from that
          run, plus two longer pieces.
        </p>

        {stories.length === 0 ? (
          <p className="mt-16 text-zinc-500">No stories yet.</p>
        ) : (
          <ol className="mt-12 divide-y divide-white/10 border-t border-white/10 sm:mt-16">
            {stories.map((story, i) => (
              <li key={story.slug}>
                <Link
                  href={`/writing/${story.slug}`}
                  className="group grid gap-5 py-8 sm:grid-cols-12 sm:gap-8 sm:py-10"
                >
                  <div className="sm:col-span-5">
                    <Image
                      src={story.cover}
                      alt={`${story.title}, title card`}
                      width={story.coverWidth}
                      height={story.coverHeight}
                      sizes="(max-width: 639px) 100vw, 320px"
                      priority={i < 2}
                      className="h-auto w-full max-w-full transition-opacity duration-300 group-hover:opacity-80"
                      style={{ maxWidth: story.coverWidth }}
                    />
                  </div>

                  <div className="sm:col-span-7">
                    <StoryMeta story={story} />
                    <h2 className="font-pixel mt-3 text-sm leading-[1.6] text-white transition-colors group-hover:text-zinc-300 sm:text-base">
                      {story.title}
                    </h2>
                    {story.tagline && (
                      <p className="mt-2 text-sm italic text-zinc-500">{story.tagline}</p>
                    )}
                    <p className="mt-3 text-base leading-relaxed text-zinc-400">{story.excerpt}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </main>
    </div>
  );
}
