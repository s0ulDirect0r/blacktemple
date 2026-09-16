'use client';

import Image from 'next/image';
import type { Rune } from '@/content/spidernomicon';
import { pad } from './format';

interface RuneTileProps {
  rune: Rune;
  /** Position in the visible grid, for the entrance stagger and eager loading. */
  index: number;
  /** Briefly lit while a Cast flickers through the lexicon. */
  lit?: boolean;
  onOpen: (number: number) => void;
}

export default function RuneTile({ rune, index, lit = false, onOpen }: RuneTileProps) {
  const image = rune.images[0];

  return (
    <li
      className="rune-in"
      style={{ animationDelay: `${Math.min(index, 40) * 18}ms` }}
    >
      <button
        type="button"
        onClick={() => onOpen(rune.number)}
        aria-label={`Rune ${rune.number}, ${rune.name}`}
        data-lit={lit || undefined}
        className="group block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
      >
        <div
          className="relative aspect-square overflow-hidden bg-black ring-1 ring-white/[0.08] transition-[box-shadow,transform] duration-300 ease-out group-hover:ring-white/40 group-data-[lit]:ring-white motion-reduce:transition-none"
        >
          {image ? (
            <Image
              src={image.url}
              alt=""
              fill
              sizes="(max-width: 639px) 33vw, (max-width: 767px) 20vw, (max-width: 1023px) 16vw, (max-width: 1279px) 12vw, 10vw"
              loading={index < 20 ? 'eager' : 'lazy'}
              className="object-contain transition-transform duration-500 ease-out group-hover:scale-[1.06] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
          ) : (
            // Runes 79–82 were cast as videos; there is no still to show.
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center">
              <span aria-hidden="true" className="font-pixel text-[10px] text-zinc-500 transition-colors group-hover:text-zinc-200">
                ▶
              </span>
              <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-600">sorcery</span>
            </div>
          )}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-pixel shrink-0 text-[8px] leading-none text-zinc-500">{pad(rune.number)}</span>
          <span className="truncate text-[11px] leading-tight text-zinc-300 transition-colors group-hover:text-white sm:text-xs">
            {rune.name}
          </span>
        </div>
      </button>
    </li>
  );
}
