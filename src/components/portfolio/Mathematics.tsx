import Image from 'next/image';
import { mathematics } from '@/content/mathematics';
import Reveal from './Reveal';
import SectionHeading from './SectionHeading';

const linkStyle = 'underline decoration-zinc-600 underline-offset-4 hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white';

export default function Mathematics() {
  return (
    <section id="mathematics" aria-labelledby="mathematics-heading" className="scroll-mt-14 sm:scroll-mt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <SectionHeading id="mathematics-heading" index="04" title="Mathematics" meta="2025–ongoing" />
          <div className="my-8 max-w-3xl space-y-5 sm:my-12">
            <p className="text-xl leading-relaxed text-zinc-200 sm:text-2xl">{mathematics.introduction}</p>
            <p className="text-sm leading-relaxed text-zinc-400">These are my original posts on X, shared as <a href="https://x.com/s0ulDirect0r" className={linkStyle}>@s0ulDirect0r</a>, documenting my mathematics journey.</p>
            <p className="text-sm text-zinc-400">What’s driving me? <a href={mathematics.motivationSource} className={linkStyle}>{mathematics.motivation}</a></p>
          </div>
        </Reveal>
        <div className="grid items-start gap-10 lg:grid-cols-3 sm:gap-12">
          {mathematics.studies.map((study) => (
            <Reveal key={study.tweetId}>
              <article>
                <a href={study.image} aria-label={`View full-size image: ${study.title}`} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                  <Image src={study.image} alt={study.alt} width={study.width} height={study.height} sizes="(min-width: 1024px) 33vw, 100vw" loading="lazy" className="h-auto w-full" />
                </a>
                {study.secondImage && (
                  <details className="mt-3 text-sm text-zinc-400">
                    <summary className="cursor-pointer py-2 hover:text-white">another page from this session</summary>
                    <a href={study.secondImage} className="mt-2 block" aria-label="View the second integration page at full size">
                      <Image src={study.secondImage} alt="A second handwritten integration-by-parts exercise with logarithms and all intermediate steps." width={900} height={1200} sizes="(min-width: 1024px) 33vw, 100vw" loading="lazy" className="h-auto w-full" />
                    </a>
                  </details>
                )}
                <p className="mt-5 text-xs text-zinc-500">{study.date}</p>
                <blockquote cite={`https://x.com/s0ulDirect0r/status/${study.tweetId}`} className="mt-3 whitespace-pre-line text-lg leading-relaxed text-zinc-200">{study.text}</blockquote>
                <p className="mt-4 flex gap-5 text-sm text-zinc-400">
                  <a href={`https://x.com/s0ulDirect0r/status/${study.tweetId}`} className={linkStyle}>original post ↗</a>
                  <a href={`https://www.community-archive.org/tweets/${study.tweetId}`} className={linkStyle}>archive ↗</a>
                </p>
              </article>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <div className="mt-12 grid gap-8 border-t border-white/10 pt-8 md:grid-cols-3">
            {mathematics.reflections.map((reflection) => (
              <article key={reflection.tweetId}>
                <blockquote cite={`https://x.com/s0ulDirect0r/status/${reflection.tweetId}`} className="whitespace-pre-line leading-relaxed text-zinc-200">{reflection.text}</blockquote>
                <a href={`https://www.community-archive.org/tweets/${reflection.tweetId}`} className={`mt-4 inline-block text-sm text-zinc-400 ${linkStyle}`}>{reflection.date} · original in archive ↗</a>
              </article>
            ))}
          </div>
          <p className="mt-8 text-xs leading-relaxed text-zinc-500">Exercise study through Math Academy; handwritten working, reflections, and Hypercalculator by Matthew D. Huff.</p>
        </Reveal>
      </div>
    </section>
  );
}
