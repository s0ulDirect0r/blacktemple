'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

type SlotsState = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; slots: Date[] };

interface CallBookingProps {
  priceLabel: string;
}

function dayKey(date: Date, timeZone: string): string {
  // en-CA formats as YYYY-MM-DD, which also sorts correctly.
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/**
 * The /calls booking widget: pick a day, pick a time (in the visitor's own time
 * zone), leave a name and email, then go to Stripe Checkout.
 */
export default function CallBooking({ priceLabel }: CallBookingProps) {
  const [timeZone, setTimeZone] = useState('UTC');
  const [state, setState] = useState<SlotsState>({ kind: 'loading' });
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSlots = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const response = await fetch('/api/calls/slots', { cache: 'no-store' });
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as { slots: string[] };
      setState({ kind: 'ready', slots: data.slots.map((iso) => new Date(iso)) });
    } catch {
      setState({ kind: 'error' });
    }
  }, []);

  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

    // Back from Checkout without paying: free the held slot before listing times.
    const url = new URL(window.location.href);
    const hold = url.searchParams.get('hold');
    const release = hold
      ? fetch('/api/calls/release', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: hold }),
        }).catch(() => undefined)
      : Promise.resolve();
    if (hold) {
      url.searchParams.delete('hold');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
    release.then(loadSlots);
  }, [loadSlots]);

  const days = useMemo(() => {
    if (state.kind !== 'ready') return [];
    const byDay = new Map<string, Date[]>();
    for (const date of state.slots) {
      const key = dayKey(date, timeZone);
      byDay.set(key, [...(byDay.get(key) ?? []), date]);
    }
    return [...byDay.entries()].map(([key, slots]) => ({ key, slots }));
  }, [state, timeZone]);

  const selectedDay = days.find((d) => d.key === day) ?? null;

  const dayLabel = (date: Date) => ({
    weekday: new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date),
    date: new Intl.DateTimeFormat('en-US', { timeZone, month: 'short', day: 'numeric' }).format(date),
  });
  const timeLabel = (date: Date) =>
    new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).format(date);
  const fullLabel = (iso: string) =>
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(new Date(iso));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!slot) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/calls/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start: slot, name, email, note, timeZone }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (response.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      setError(data.error ?? 'Something went wrong. Please try again.');
      if (response.status === 409) {
        setSlot(null);
        loadSlots();
      }
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setSubmitting(false);
  }

  const tile =
    'border px-3 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';
  const tileState = (active: boolean) =>
    active ? 'border-white bg-white text-black' : 'border-white/20 text-zinc-200 hover:border-white';
  const field =
    'mt-2 block w-full border border-white/20 bg-transparent px-3 py-2.5 text-base text-white placeholder:text-zinc-600 focus:border-white focus:outline-none';

  return (
    <section aria-labelledby="book-heading">
      <h2 id="book-heading" className="font-pixel text-lg text-white sm:text-xl">
        Book a time
      </h2>

      {state.kind === 'loading' && <p className="mt-6 text-zinc-500">Loading open times…</p>}

      {state.kind === 'error' && (
        <p className="mt-6 text-zinc-400">
          Couldn&apos;t load open times.{' '}
          <button type="button" onClick={loadSlots} className="text-white underline underline-offset-4">
            Try again
          </button>
        </p>
      )}

      {state.kind === 'ready' && days.length === 0 && (
        <p className="mt-6 text-zinc-400">No open times in the next few weeks. Check back soon.</p>
      )}

      {state.kind === 'ready' && days.length > 0 && (
        <>
          <p className="mt-3 text-sm text-zinc-500">Times shown in {timeZone.replace(/_/g, ' ')}.</p>

          <fieldset className="mt-6">
            <legend className="text-sm text-zinc-400">Day</legend>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {days.map(({ key, slots }) => {
                const label = dayLabel(slots[0]);
                const active = key === day;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setDay(key);
                      setSlot(null);
                    }}
                    className={`${tile} ${tileState(active)}`}
                  >
                    <span className="block text-xs uppercase tracking-wider opacity-70">{label.weekday}</span>
                    <span className="mt-0.5 block text-base">{label.date}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {selectedDay && (
            <fieldset className="mt-8">
              <legend className="text-sm text-zinc-400">Time</legend>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {selectedDay.slots.map((date) => {
                  const iso = date.toISOString();
                  const active = iso === slot;
                  return (
                    <button
                      key={iso}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSlot(iso)}
                      className={`${tile} ${tileState(active)} font-[family-name:var(--font-geist-mono)] text-sm tabular-nums`}
                    >
                      {timeLabel(date)}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {slot && (
            <form onSubmit={submit} className="mt-10 border-t border-white/10 pt-8">
              <p className="text-white">{fullLabel(slot)}</p>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <label className="block text-sm text-zinc-400">
                  Name
                  <input
                    required
                    maxLength={100}
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={field}
                  />
                </label>
                <label className="block text-sm text-zinc-400">
                  Email
                  <input
                    required
                    type="email"
                    maxLength={254}
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={field}
                  />
                </label>
              </div>

              <label className="mt-5 block text-sm text-zinc-400">
                Anything you&apos;d like me to know beforehand? <span className="text-zinc-600">(optional)</span>
                <textarea
                  rows={4}
                  maxLength={2000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className={`${field} resize-y`}
                />
              </label>

              {error && (
                <p role="alert" className="mt-5 text-sm text-red-300">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 w-full border border-white bg-white px-5 py-3 font-pixel text-sm text-black transition-colors hover:bg-zinc-200 disabled:opacity-60 sm:w-auto"
              >
                {submitting ? 'Opening checkout…' : `Continue to payment · ${priceLabel}`}
              </button>
              <p className="mt-3 text-xs text-zinc-500">
                Secure payment through Stripe. Your time is held for 30 minutes while you pay.{' '}
                <Link href="/privacy" className="underline underline-offset-2 hover:text-zinc-300">
                  Privacy
                </Link>
              </p>
            </form>
          )}

          {!slot && error && (
            <p role="alert" className="mt-6 text-sm text-red-300">
              {error}
            </p>
          )}
        </>
      )}
    </section>
  );
}
