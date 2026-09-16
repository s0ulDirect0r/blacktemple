'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { tweetUrl, type Rune } from '@/content/spidernomicon';
import { formatDate, pad } from './format';

interface RuneDialogProps {
  rune: Rune | null;
  /** "12 of 100", or "3 of 7" while a search is narrowing the lexicon. */
  position: string;
  onClose: () => void;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
}

/**
 * Native <dialog>: the browser handles the top layer, focus trapping and
 * Escape. Left/right arrows move through the lexicon.
 */
export default function RuneDialog({ rune, position, onClose, onPrev, onNext }: RuneDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = rune !== null;
  // Latest `open`, for the native close handler below. Declared before the
  // show/close effect so it is current by the time dialog.close() runs.
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // <dialog> does not lock page scroll behind it.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Keys are handled at the window so navigation keeps working even if focus
  // has drifted (the panel remounts on every rune change).
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && onPrev) {
        event.preventDefault();
        onPrev();
      } else if (event.key === 'ArrowRight' && onNext) {
        event.preventDefault();
        onNext();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onPrev, onNext, onClose]);

  // The native close event also fires for our own dialog.close() above; only
  // treat it as a request when the parent still believes the rune is open.
  const handleNativeClose = () => {
    if (openRef.current) onClose();
  };

  // Clicks on the backdrop land on the dialog element itself.
  const handleClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby="rune-dialog-title"
      onClose={handleNativeClose}
      onClick={handleClick}
      className="m-0 h-full max-h-none w-full max-w-none bg-black p-0 text-zinc-100 backdrop:bg-black/85 open:animate-[rune-dialog-in_220ms_ease-out] sm:m-auto sm:h-auto sm:max-h-[92svh] sm:w-[min(96vw,64rem)] sm:border sm:border-white/10 motion-reduce:open:animate-none"
    >
      {rune && (
        <RuneDetail key={rune.number} rune={rune} position={position} onClose={onClose} onPrev={onPrev} onNext={onNext} />
      )}
    </dialog>
  );
}

function RuneDetail({
  rune,
  position,
  onClose,
  onPrev,
  onNext,
}: {
  rune: Rune;
  position: string;
  onClose: () => void;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
}) {
  const [shown, setShown] = useState(0);
  const image = rune.images[shown] ?? rune.images[0];
  const isVideo = rune.images.length === 0;
  const panel = useRef<HTMLElement>(null);

  // Each rune is a fresh panel; put focus on it so the title is announced and
  // the reading column scrolls from the top.
  useEffect(() => {
    panel.current?.focus({ preventScroll: true });
  }, []);

  return (
    <article
      ref={panel}
      tabIndex={-1}
      className="flex h-full max-h-[100svh] flex-col outline-none sm:max-h-[92svh] sm:flex-row"
    >
      {/* Drawing */}
      <div className="relative flex shrink-0 items-center justify-center bg-black sm:w-[55%] sm:shrink">
        {image ? (
          <div className="relative aspect-square w-full max-h-[52svh] sm:max-h-[92svh]">
            <Image
              src={image.url}
              alt={`Rune ${rune.number}, ${rune.name}`}
              fill
              priority
              sizes="(max-width: 639px) 100vw, 560px"
              className="object-contain"
            />
          </div>
        ) : (
          <div className="flex aspect-square w-full max-h-[40svh] flex-col items-center justify-center gap-4 sm:max-h-none">
            <span aria-hidden="true" className="font-pixel text-2xl text-zinc-600">▶</span>
            <p className="max-w-[24ch] text-center text-sm text-zinc-500">
              This one was cast as a video, not a drawing.
            </p>
          </div>
        )}

        {rune.images.length > 1 && (
          <ul className="absolute bottom-3 left-3 flex gap-2" aria-label="Variants">
            {rune.images.map((variant, i) => (
              <li key={variant.url}>
                <button
                  type="button"
                  onClick={() => setShown(i)}
                  aria-label={`Variant ${i + 1}`}
                  aria-pressed={i === shown}
                  className="relative block h-10 w-10 overflow-hidden bg-black ring-1 ring-white/20 transition-[box-shadow] aria-pressed:ring-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <Image src={variant.url} alt="" fill sizes="40px" className="object-contain" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Reading */}
      <div className="flex min-h-0 flex-1 flex-col border-t border-white/10 sm:border-l sm:border-t-0">
        <header className="flex items-center justify-between gap-4 px-4 pt-4 sm:px-8 sm:pt-7">
          <p className="font-pixel text-[9px] text-zinc-500 sm:text-[10px]">
            {pad(rune.number)} <span className="text-zinc-700">/</span> {position}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 px-2 py-1 text-xs uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:text-white focus-visible:text-white focus-visible:outline-none"
          >
            Esc
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-7">
          <h2
            id="rune-dialog-title"
            className="text-balance text-[15px] leading-[1.6] text-white sm:text-lg sm:leading-[1.6] [font-family:var(--font-pixel),monospace] [letter-spacing:0.05em]"
          >
            {rune.name}
          </h2>

          {rune.meaning ? (
            <p className="mt-5 whitespace-pre-line text-base leading-relaxed text-zinc-300 sm:mt-6 sm:text-lg sm:leading-relaxed">
              {rune.meaning}
            </p>
          ) : (
            <p className="mt-5 text-base leading-relaxed text-zinc-500 sm:mt-6">
              {isVideo ? 'No words were given for this one; the video is the rune.' : 'No words were given for this one.'}
            </p>
          )}

          <dl className="mt-8 space-y-2 text-xs text-zinc-500 sm:mt-10">
            <div className="flex gap-3">
              <dt className="w-14 shrink-0 uppercase tracking-[0.18em]">Cast</dt>
              <dd>
                <time dateTime={rune.date}>{formatDate(rune.date)}</time>
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-14 shrink-0 uppercase tracking-[0.18em]">Source</dt>
              <dd>
                <a
                  href={tweetUrl(rune.tweetId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-300 underline decoration-zinc-700 underline-offset-4 transition-colors hover:text-white hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                >
                  {isVideo ? 'Watch the original on X' : 'Original tweet on X'} <span aria-hidden="true">↗</span>
                </a>
              </dd>
            </div>
          </dl>
        </div>

        <nav aria-label="Neighbouring runes" className="flex items-center justify-between border-t border-white/10 px-4 py-3 sm:px-8">
          <button
            type="button"
            onClick={onPrev ?? undefined}
            disabled={!onPrev}
            className="font-pixel text-[9px] text-zinc-400 transition-colors hover:text-white disabled:text-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            ← Prev
          </button>
          <span className="hidden text-[10px] uppercase tracking-[0.2em] text-zinc-700 sm:inline">arrow keys</span>
          <button
            type="button"
            onClick={onNext ?? undefined}
            disabled={!onNext}
            className="font-pixel text-[9px] text-zinc-400 transition-colors hover:text-white disabled:text-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            Next →
          </button>
        </nav>
      </div>
    </article>
  );
}
