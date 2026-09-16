import type { Metadata } from 'next';
import type { ComponentPropsWithoutRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getStories, getStory } from '@/lib/mdx';
import WritingHeader from '@/components/writing/WritingHeader';
import StoryMeta from '@/components/writing/StoryMeta';
import StorySequence from '@/components/writing/StorySequence';

interface StoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getStories().map((story) => ({ slug: story.slug }));
}

export async function generateMetadata({ params }: StoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const story = getStory(slug);

  if (!story) {
    return { title: 'Story not found' };
  }

  const { title, excerpt, cover, coverWidth, coverHeight } = story.metadata;

  return {
    title,
    description: excerpt,
    openGraph: {
      title: `${title} · Matthew D. Huff`,
      description: excerpt,
      type: 'article',
      images: [{ url: cover, width: coverWidth, height: coverHeight, alt: `${title}, title card` }],
    },
  };
}

// Prose: a comfortable reading measure. Poems: the same, but every line break
// in the source is kept (markdown soft breaks arrive as "\n" in the text).
const proseComponents = {
  h2: (props: ComponentPropsWithoutRef<'h2'>) => (
    <h2 className="font-pixel mb-8 mt-16 text-xs leading-[1.6] text-zinc-300 first:mt-0 sm:text-sm" {...props} />
  ),
  h3: (props: ComponentPropsWithoutRef<'h3'>) => (
    <h3
      className="mb-3 mt-12 font-[family-name:var(--font-geist-mono)] text-xs tracking-widest text-zinc-500"
      {...props}
    />
  ),
  p: (props: ComponentPropsWithoutRef<'p'>) => <p className="mb-6 last:mb-0" {...props} />,
};

const poemComponents = {
  ...proseComponents,
  p: (props: ComponentPropsWithoutRef<'p'>) => (
    <p className="mb-6 whitespace-pre-line last:mb-0" {...props} />
  ),
};

export default async function StoryPage({ params }: StoryPageProps) {
  const { slug } = await params;
  const story = getStory(slug);

  if (!story) {
    notFound();
  }

  const { metadata, content } = story;
  const stories = getStories();
  const index = stories.findIndex((s) => s.slug === slug);
  const previous = index > 0 ? stories[index - 1] : null;
  const next = index >= 0 && index < stories.length - 1 ? stories[index + 1] : null;

  const isIllustrated = metadata.kind === 'illustrated' && metadata.sequence?.length;
  const body = content.trim();

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <WritingHeader />

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-6 sm:pb-32 sm:pt-14">
        <article>
          <header>
            {/* Title card, full width at its native ratio. Illustrated pieces
                open with it as the first page of the sequence instead. */}
            {!isIllustrated && (
              <Image
                src={metadata.cover}
                alt={`${metadata.title}, title card`}
                width={metadata.coverWidth}
                height={metadata.coverHeight}
                sizes="(max-width: 767px) 100vw, 768px"
                priority
                className="h-auto w-full"
              />
            )}

            <div className={isIllustrated ? '' : 'mt-8 sm:mt-10'}>
              <StoryMeta story={metadata} />
              <h1 className="font-pixel mt-4 text-base leading-[1.6] text-white sm:text-xl lg:text-2xl">
                {metadata.title}
              </h1>
              {metadata.tagline && (
                <p className="mt-3 font-serif text-lg italic leading-relaxed text-zinc-400">
                  {metadata.tagline}
                </p>
              )}
            </div>
          </header>

          {isIllustrated && (
            <div className="mt-10 sm:mt-14">
              <StorySequence title={metadata.title} images={metadata.sequence!} />
            </div>
          )}

          {/* Reading column: 65ch at 18px. The sign-off and source link share
              the column so their left edge lines up with the text. */}
          <div
            className={`mx-auto mt-12 max-w-[65ch] font-serif text-[18px] leading-[1.75] text-zinc-200 sm:mt-16 ${
              isIllustrated ? 'text-center' : ''
            }`}
          >
            {body && (
              <MDXRemote
                source={body}
                components={metadata.kind === 'poem' ? poemComponents : proseComponents}
              />
            )}

            {metadata.signoff && (
              <p className="mt-12 whitespace-pre-line text-base italic leading-relaxed text-zinc-500">
                {metadata.signoff}
              </p>
            )}

            {metadata.originalUrl && (
              <p className="mt-12 font-sans text-xs text-zinc-500">
                <a
                  href={metadata.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-zinc-700 underline-offset-4 transition-colors hover:text-zinc-300 hover:decoration-zinc-500"
                >
                  Originally posted as a thread on X
                </a>
              </p>
            )}
          </div>
        </article>

        <nav
          aria-label="More stories"
          className="mt-16 grid gap-6 border-t border-white/10 pt-8 sm:mt-20 sm:grid-cols-2 sm:gap-8"
        >
          <div>
            {previous && (
              <Link href={`/writing/${previous.slug}`} className="group block">
                <span className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Previous</span>
                <span className="font-pixel mt-2 block text-xs leading-[1.6] text-zinc-300 transition-colors group-hover:text-white sm:text-sm">
                  {previous.title}
                </span>
              </Link>
            )}
          </div>
          <div className="sm:text-right">
            {next && (
              <Link href={`/writing/${next.slug}`} className="group block">
                <span className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Next</span>
                <span className="font-pixel mt-2 block text-xs leading-[1.6] text-zinc-300 transition-colors group-hover:text-white sm:text-sm">
                  {next.title}
                </span>
              </Link>
            )}
          </div>
        </nav>

        <p className="mt-10">
          <Link
            href="/writing"
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
          >
            ← All writing
          </Link>
        </p>
      </main>
    </div>
  );
}
