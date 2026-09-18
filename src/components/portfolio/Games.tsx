import Image from 'next/image';
import type { PortfolioGame } from '@/content/portfolio';
import SectionHeading from './SectionHeading';
import Reveal from './Reveal';
import ExternalLink from './ExternalLink';
import VideoPreview from './VideoPreview';

interface GamesProps {
  index: string;
  games: PortfolioGame[];
}

function GameMedia({ game }: { game: PortfolioGame }) {
  if (game.video) {
    const { video } = game;
    return (
      <figure>
        {video.previewSrc ? <VideoPreview video={video} title={game.title} /> : (
        <div className="overflow-hidden bg-zinc-900" style={{ aspectRatio: `${video.width} / ${video.height}` }}>
          <video
            src={video.src}
            poster={video.poster}
            controls
            playsInline
            preload="metadata"
            className="h-full w-full"
          />
        </div>
        )}
        {video.caption && (
          <figcaption className="mt-2 text-[11px] text-zinc-500 sm:text-xs">{video.caption}</figcaption>
        )}
      </figure>
    );
  }

  if (game.images.length === 1) {
    const [image] = game.images;
    return (
      <div className="overflow-hidden bg-zinc-900">
        <Image
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          sizes="(max-width: 1023px) 100vw, 58vw"
          className="h-auto w-full"
        />
      </div>
    );
  }

  // A mosaic: first image wide, the rest in a row beneath it.
  const [lead, ...rest] = game.images;
  return (
    <div className="grid gap-2 sm:gap-3">
      <div className="relative aspect-[3/2] overflow-hidden bg-zinc-900">
        <Image
          src={lead.src}
          alt={lead.alt}
          fill
          sizes="(max-width: 1023px) 100vw, 58vw"
          className="object-cover"
        />
      </div>
      {rest.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {rest.map((image) => (
            <div key={image.src} className="relative aspect-[3/2] overflow-hidden bg-zinc-900">
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(max-width: 1023px) 33vw, 19vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Games({ index, games }: GamesProps) {
  return (
    <section id="games" aria-labelledby="games-heading" className="scroll-mt-14 sm:scroll-mt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <SectionHeading id="games-heading" index={index} title="Games" meta={`${games.length} games`} />
        </Reveal>

        <div className="divide-y divide-white/10">
          {games.map((game, i) => {
            const flipped = i % 2 === 1;
            return (
              <Reveal key={game.title}>
                <article className="grid gap-8 py-12 sm:py-16 lg:grid-cols-12 lg:gap-12 lg:py-20">
                  <div className={`lg:col-span-7 ${flipped ? 'lg:order-2' : ''}`}>
                    <GameMedia game={game} />
                  </div>

                  <div className={`flex flex-col lg:col-span-5 ${flipped ? 'lg:order-1' : ''}`}>
                    <h3 className="font-pixel text-base leading-[1.4] text-white sm:text-xl">{game.title}</h3>
                    <p className="mt-5 text-xl leading-snug text-zinc-100 sm:text-2xl sm:leading-snug">{game.pitch}</p>
                    <p className="mt-5 text-base leading-relaxed text-zinc-400">{game.description}</p>
                    <ul
                      aria-label="Built with"
                      className="mt-6 flex flex-wrap gap-y-1 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.16em] text-zinc-500 sm:text-xs"
                    >
                      {game.tech.map((item) => (
                        <li
                          key={item}
                          className="[&:not(:last-child)]:after:mx-3 [&:not(:last-child)]:after:text-zinc-700 [&:not(:last-child)]:after:content-['·']"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
                      {game.links.live && (
                        <a
                          href={game.links.live}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-11 items-center bg-white px-6 text-sm font-medium tracking-wide text-black transition-colors hover:bg-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                        >
                          Play it live
                        </a>
                      )}
                      <ExternalLink href={game.links.repo} className="text-sm">
                        Source on GitHub
                      </ExternalLink>
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
