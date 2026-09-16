'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { Rune, Sorcery } from '@/content/spidernomicon';
import RuneTile from './RuneTile';
import RuneDialog from './RuneDialog';
import Sorceries from './Sorceries';

interface SpidernomiconProps {
  runes: Rune[];
  sorceries: Sorcery[];
}

const PATH = '/spidernomicon';

// The open rune lives in the URL (/spidernomicon?rune=N) so it can be linked
// and so back/forward behave. pushState does not fire popstate, so the store
// is nudged by hand after every history write.
const urlListeners = new Set<() => void>();
function subscribeToUrl(listener: () => void) {
  urlListeners.add(listener);
  window.addEventListener('popstate', listener);
  return () => {
    urlListeners.delete(listener);
    window.removeEventListener('popstate', listener);
  };
}
function notifyUrl() {
  urlListeners.forEach((listener) => listener());
}
function readRuneParam(): string {
  return new URLSearchParams(window.location.search).get('rune') ?? '';
}
function serverRuneParam(): string {
  return '';
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function Spidernomicon({ runes, sorceries }: SpidernomiconProps) {
  const [query, setQuery] = useState('');
  const runeParam = useSyncExternalStore(subscribeToUrl, readRuneParam, serverRuneParam);
  /** Rune briefly lit while a Cast flickers through the grid. */
  const [litNumber, setLitNumber] = useState<number | null>(null);
  const castTimer = useRef<number | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return runes;
    return runes.filter(
      (rune) =>
        String(rune.number) === q ||
        rune.name.toLowerCase().includes(q) ||
        rune.meaning.toLowerCase().includes(q)
    );
  }, [runes, query]);

  const byNumber = useMemo(() => new Map(runes.map((rune) => [rune.number, rune])), [runes]);
  const openRune = byNumber.get(Number(runeParam)) ?? null;
  const openIndex = openRune ? visible.indexOf(openRune) : -1;

  // --- URL sync ---------------------------------------------------------------

  const open = useCallback((number: number) => {
    window.history.pushState({ rune: number, pushed: true }, '', `${PATH}?rune=${number}`);
    notifyUrl();
  }, []);

  const goTo = useCallback((number: number) => {
    const pushed = Boolean(window.history.state?.pushed);
    window.history.replaceState({ rune: number, pushed }, '', `${PATH}?rune=${number}`);
    notifyUrl();
  }, []);

  const close = useCallback(() => {
    if (window.history.state?.pushed) {
      // Opened from the grid: step back to the plain URL (fires popstate).
      window.history.back();
    } else {
      // Arrived by deep link: there is nothing behind us to return to.
      window.history.replaceState({}, '', PATH);
      notifyUrl();
    }
  }, []);

  // --- Cast: pick a rune at random ---------------------------------------------

  useEffect(() => () => {
    if (castTimer.current) window.clearTimeout(castTimer.current);
  }, []);

  const cast = () => {
    const pool = visible.length ? visible : runes;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    if (prefersReducedMotion() || pool.length < 3) {
      open(chosen.number);
      return;
    }
    // Flicker through a handful of runes before settling; a small ritual.
    const steps = 9;
    let step = 0;
    const tick = () => {
      step += 1;
      if (step < steps) {
        setLitNumber(pool[Math.floor(Math.random() * pool.length)].number);
        castTimer.current = window.setTimeout(tick, 45 + step * 12);
      } else {
        setLitNumber(chosen.number);
        castTimer.current = window.setTimeout(() => {
          setLitNumber(null);
          open(chosen.number);
        }, 180);
      }
    };
    tick();
  };

  const prevNumber = openIndex > 0 ? visible[openIndex - 1].number : null;
  const nextNumber = openIndex >= 0 && openIndex < visible.length - 1 ? visible[openIndex + 1].number : null;
  const onPrev = useMemo(() => (prevNumber === null ? null : () => goTo(prevNumber)), [prevNumber, goTo]);
  const onNext = useMemo(() => (nextNumber === null ? null : () => goTo(nextNumber)), [nextNumber, goTo]);
  const position =
    openIndex >= 0 ? `${openIndex + 1} of ${visible.length}` : `${runes.length}`;

  return (
    <>
      {/* Controls: sticky so the lexicon can be searched from anywhere in the grid. */}
      <div className="sticky top-0 z-40 -mx-4 border-b border-white/10 bg-black/85 px-4 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex h-14 items-center gap-4 sm:h-16 sm:gap-6">
          <label className="relative flex min-w-0 flex-1 items-center gap-3">
            <span className="sr-only">Search the lexicon by name or meaning</span>
            <span aria-hidden="true" className="font-pixel shrink-0 text-[9px] text-zinc-600">
              ?
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="name or meaning"
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none sm:text-base [&::-webkit-search-cancel-button]:appearance-none"
            />
          </label>
          <p className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-zinc-500 sm:text-xs" aria-live="polite">
            {visible.length === runes.length ? `${runes.length} runes` : `${visible.length} of ${runes.length}`}
          </p>
          <button
            type="button"
            onClick={cast}
            disabled={litNumber !== null}
            className="font-pixel shrink-0 border border-white/25 px-3 py-2 text-[9px] text-white transition-colors hover:border-white hover:bg-white hover:text-black disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:px-4 sm:text-[10px]"
            title="Open a rune at random"
          >
            Cast
          </button>
        </div>
      </div>

      {visible.length > 0 ? (
        <ul
          className="mt-8 grid grid-cols-3 gap-x-4 gap-y-6 sm:mt-12 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10"
          aria-label="Runes"
        >
          {visible.map((rune, i) => (
            <RuneTile key={rune.number} rune={rune} index={i} lit={litNumber === rune.number} onOpen={open} />
          ))}
        </ul>
      ) : (
        <p className="py-24 text-center text-zinc-500">
          No rune answers to <span className="text-zinc-300">“{query.trim()}”</span>.
        </p>
      )}

      <Sorceries sorceries={sorceries} />

      <RuneDialog rune={openRune} position={position} onClose={close} onPrev={onPrev} onNext={onNext} />
    </>
  );
}
