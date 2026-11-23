'use client';

import { useCallback, useEffect, useState } from 'react';
import type { HomePeriod, Intention, Result } from '@/lib/sense/intentions';
import { addDays, type Period } from '@/lib/sense/periods';
import { sense } from './api';
import { CountUp } from './juice';

interface Home { date: string; periods: HomePeriod[]; closed: Record<string, number> }
interface Closed { kind: 'task' | 'intention' | 'review' | 'habit' | 'talked'; text: string; context: string }

const field = 'w-full rounded-md border border-violet-300/35 bg-black/60 px-4 py-3 text-xl text-zinc-100 placeholder:text-zinc-600 focus:border-violet-300 focus:outline-none';
const NAME: Record<Period, string> = { year: 'Year', quarter: 'Quarter', month: 'Month', week: 'Week', day: 'Today' };
const LAST: Record<Period, string> = { year: 'Last year', quarter: 'Last quarter', month: 'Last month', week: 'Last week', day: 'Yesterday' };
const RESULT: Record<Result, string> = { yes: 'It happened', partly: 'Partly', no: 'It didn’t' };
const message = (e: unknown) => (e instanceof Error ? e.message : 'That didn’t work. Try again.');

/** Today's date where you are, as YYYY-MM-DD. */
function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const at = (date: string) => new Date(`${date}T12:00:00`);
const fmt = (date: string, options: Intl.DateTimeFormatOptions) => at(date).toLocaleDateString([], options);

function label(p: Pick<HomePeriod, 'period' | 'start' | 'end'>) {
  if (p.period === 'year') return p.start.slice(0, 4);
  if (p.period === 'quarter') return `${fmt(p.start, { month: 'short' })} to ${fmt(p.end, { month: 'short' })}`;
  if (p.period === 'month') return fmt(p.start, { month: 'long' });
  if (p.period === 'week') return `${fmt(p.start, { month: 'short', day: 'numeric' })} to ${fmt(p.end, { month: 'short', day: 'numeric' })}`;
  return fmt(p.start, { weekday: 'long', month: 'long', day: 'numeric' });
}

/** A one-line box: Enter saves, Escape cancels. */
function Line({ initial = '', placeholder, onSave, onCancel, autoFocus }: { initial?: string; placeholder: string; onSave: (text: string) => void; onCancel?: () => void; autoFocus?: boolean }) {
  const [text, setText] = useState(initial);
  return (
    <input value={text} onChange={e => setText(e.target.value)} placeholder={placeholder} aria-label={placeholder} autoFocus={autoFocus} maxLength={500} className={field}
      onKeyDown={e => { if (e.key === 'Enter' && text.trim()) onSave(text); if (e.key === 'Escape') onCancel?.(); }} onBlur={() => onCancel?.()} />
  );
}

/** "How did it go?": an optional note, then one of three answers. */
function Review({ intention, onReviewed, onError }: { intention: Intention; onReviewed: (i: Intention) => void; onError: (text: string) => void }) {
  const [note, setNote] = useState('');
  const send = (result: Result) => sense<Intention>(`/intentions/${intention.id}`, { method: 'PATCH', body: JSON.stringify({ result, note }) }).then(onReviewed).catch(e => onError(message(e)));
  return (
    <div className="space-y-3">
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="One thing you noticed (optional)" aria-label="One thing you noticed" maxLength={2000} className={field} />
      <div className="flex flex-wrap gap-3">
        {(Object.keys(RESULT) as Result[]).map(r => (
          <button key={r} type="button" onClick={() => send(r)} className="rounded-md border border-white/20 px-5 py-2.5 text-lg text-zinc-200 hover:bg-white/10">{RESULT[r]}</button>
        ))}
      </div>
    </div>
  );
}

const outcome = (i: Intention) => <><span className="text-amber-300">{RESULT[i.result!]}.</span> {i.note}</>;

/** A year of days, one column per week. Brighter means more closed that day; click a day to see what. */
function Tracker({ home }: { home: Home }) {
  const [picked, setPicked] = useState<{ date: string; items: Closed[] | null } | null>(null);
  const first = addDays(home.date, -364);
  const days = Array.from({ length: 365 }, (_, i) => addDays(first, i));
  const lead = at(first).getDay();   // empty cells so the first column starts on a Sunday
  const level = (n: number) => (n === 0 ? 'bg-zinc-900' : n === 1 ? 'bg-[#2e2558]' : n <= 3 ? 'bg-[#5b47b8]' : n <= 5 ? 'bg-[#9d87f5]' : 'bg-violet-200 shadow-[0_0_6px_#c4b5fd88]');
  const count = (date: string) => home.closed[date] ?? 0;
  const total = days.reduce((sum, d) => sum + count(d), 0);
  // An empty today doesn't break a run: it may still happen.
  let streak = 0;
  for (let i = count(home.date) ? 364 : 363; i >= 0 && count(days[i]) > 0; i--) streak++;

  const pick = (date: string) => {
    if (picked?.date === date) { setPicked(null); return; }
    setPicked({ date, items: null });
    sense<{ items: Closed[] }>(`/home/day?date=${date}&tz=${encodeURIComponent(zone())}`).then(r => setPicked(p => (p?.date === date ? { date, items: r.items } : p))).catch(() => setPicked(null));
  };
  const weeks = Math.ceil((lead + 365) / 7);
  const monthAt = (week: number) => { const d = days[week * 7 - lead]; return d && Number(d.slice(8)) <= 7 ? fmt(d, { month: 'short' }) : ''; };

  return (
    <section aria-label="Closed in the last year">
      <div className="flex items-center gap-3">
        <h2 className="sense-eyebrow">Closed in the last year</h2>
        <span className="ml-auto flex items-center gap-1 text-sm text-zinc-500">Less{[0, 1, 2, 4, 6].map(n => <i key={n} className={`h-3.5 w-3.5 rounded-sm ${level(n)}`} />)}More</span>
      </div>
      <div className="sense-scroll mt-4 overflow-x-auto pb-1">
        <div className="min-w-[640px]">
        <div className="grid gap-[3px] text-sm text-zinc-500" style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}>
          {Array.from({ length: weeks }, (_, w) => <span key={w} className="h-6 overflow-visible whitespace-nowrap">{monthAt(w)}</span>)}
        </div>
        <div className="grid grid-flow-col grid-rows-[repeat(7,auto)] gap-[3px]" style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}>
          {Array.from({ length: lead }, (_, i) => <span key={i} />)}
          {days.map((d, i) => (
            <button key={d === home.date ? `${d}:${count(d)}` : d} type="button" style={{ '--d': `${Math.floor((lead + i) / 7) * 11}ms` } as React.CSSProperties} onClick={() => pick(d)} title={`${fmt(d, { month: 'short', day: 'numeric' })}: ${count(d)} closed`} aria-label={`${fmt(d, { month: 'long', day: 'numeric' })}: ${count(d)} closed`}
              className={`home-cell aspect-square w-full rounded-sm ${level(count(d))} ${d === home.date ? 'today outline outline-1 outline-offset-1 outline-white' : ''} ${picked?.date === d ? 'outline outline-2 outline-offset-1 outline-[#b9f5ff]' : ''}`} />
          ))}
        </div>
        </div>
      </div>
      <dl className="mt-8 flex gap-14">
        {[[total, 'closed this year'], [streak, 'days in a row'], [count(home.date), 'today']].map(([n, what]) => (
          <div key={what}><dd className="home-num text-4xl text-white"><CountUp value={n as number} /></dd><dt className="mt-3 text-base text-zinc-500">{what}</dt></div>
        ))}
      </dl>
      <p className="mt-4 text-sm text-zinc-600">Counts tasks ticked off, habits done, people you talked with, intentions set and reviews done.</p>
      {picked && (
        <div className="mt-6" aria-live="polite">
          <p className="sense-eyebrow">{fmt(picked.date, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          {picked.items === null ? <p className="text-lg text-zinc-600">…</p>
            : picked.items.length === 0 ? <p className="mt-1 text-lg text-zinc-500">Nothing closed that day.</p>
            : <ul className="mt-2 space-y-1 text-lg text-zinc-300">{picked.items.map((item, i) => (
                <li key={i}><span className="text-zinc-500">{item.kind === 'task' ? `Task · ${item.context}` : item.kind === 'habit' ? 'Habit' : item.kind === 'talked' ? 'Talked with' : item.kind === 'intention' ? `Intention set · ${item.context}` : `Review · ${item.context}`}:</span> {item.text}</li>
              ))}</ul>}
        </div>
      )}
    </section>
  );
}

/** Sense Home: the intentions for the year, quarter, month and week above today's, and a tracker of what gets closed. */
export default function SenseHome() {
  const [home, setHome] = useState<Home | null>(null);
  const [editing, setEditing] = useState<Period | null>(null);
  const [error, setError] = useState('');
  // True for a second after today is reviewed: the box bursts with light.
  const [burst, setBurst] = useState(false);

  const load = useCallback(() => sense<Home>(`/home?date=${localToday()}&tz=${encodeURIComponent(zone())}`).then(h => { setHome(h); setError(''); }).catch(e => setError(message(e))), []);
  useEffect(() => { load(); }, [load]);

  const save = (period: Period, body: string) => {
    setEditing(null);
    sense<Intention>('/intentions', { method: 'POST', body: JSON.stringify({ period, date: localToday(), body }) }).then(load).catch(e => setError(message(e)));
  };

  if (!home) return <div className="px-5 py-5 text-sm text-red-300" role="alert">{error}</div>;
  const overdue = home.periods.filter(p => p.unreviewed);
  // Nearest first: the path runs from today out to the year.
  const ladder = home.periods.filter(p => p.period !== 'day').reverse();
  const day = home.periods.find(p => p.period === 'day')!;
  const mine = day.intention;

  return (
    <div className="sense-scroll h-full overflow-y-auto px-6 py-8 lg:px-10 [&_.sense-eyebrow]:text-[10px]">
      <div className="mx-auto max-w-6xl">
        {error && <p role="alert" className="mb-3 text-sm text-red-300">{error}</p>}

        {overdue.map(p => (
          <section key={p.period} className="mb-8 rounded-lg border border-amber-300/30 p-6 lg:p-8" aria-label={`Review ${LAST[p.period].toLowerCase()}`}>
            <p className="sense-eyebrow !text-amber-300">{LAST[p.period]} · how did it go?</p>
            <p className="mb-5 mt-2 text-3xl leading-snug text-white">{p.unreviewed!.body}</p>
            <Review intention={p.unreviewed!} onReviewed={load} onError={setError} />
          </section>
        ))}

        <section className={`home-today mb-6 rounded-xl border p-6 lg:p-12 ${mine?.result ? 'closed' : 'open'} ${burst ? 'burst' : ''}`} aria-label="Today">
          <p className={`sense-eyebrow ${mine?.result ? '!text-amber-300' : ''}`}>{mine?.result ? 'Day closed' : mine ? 'Today’s intention' : label(day)}</p>
          {!mine || editing === 'day' ? (
            <>
              {!mine && <p className="home-title mb-6 mt-2 text-4xl leading-tight text-white lg:text-5xl">What’s your intention for today?</p>}
              <Line key={`day:${editing === 'day'}`} initial={mine?.body} placeholder="One thing. Press Enter." autoFocus onSave={body => save('day', body)} onCancel={mine ? () => setEditing(null) : undefined} />
            </>
          ) : (
            <>
              <button type="button" onClick={() => setEditing('day')} title="Click to reword" className="home-title mb-6 mt-2 block text-left text-4xl leading-tight text-white lg:text-5xl">{mine.body}</button>
              {mine.result ? <p className="text-xl text-zinc-300">{outcome(mine)}</p> : (
                <><p className="mb-3 text-lg text-zinc-400">When the day is done: how did it go?</p><Review intention={mine} onReviewed={() => { setBurst(true); setTimeout(() => setBurst(false), 1000); load(); }} onError={setError} /></>
              )}
            </>
          )}
        </section>

        <section aria-label="Intentions" className="home-path">
          {ladder.map(p => {
            const length = Math.round((at(p.end).getTime() - at(p.start).getTime()) / 86_400_000) + 1;
            return (
              <div key={p.period} className="grid grid-cols-[28px_120px_minmax(0,1fr)_auto] items-baseline gap-x-5 gap-y-4 py-6">
                <span className={`home-node self-center ${p.intention?.result ? 'done' : p.intention ? 'set' : ''}`} aria-hidden="true" />
                <div><p className="sense-eyebrow">{NAME[p.period]}</p><p className="mt-1 text-sm text-zinc-500">{label(p)}</p></div>
                {editing === p.period || !p.intention ? (
                  <Line key={`${p.period}:${editing === p.period}`} initial={p.intention?.body} placeholder={`Intention for this ${p.period}. Press Enter.`} autoFocus={editing === p.period}
                    onSave={body => save(p.period, body)} onCancel={p.intention ? () => setEditing(null) : undefined} />
                ) : (
                  <div>
                    <button type="button" onClick={() => setEditing(p.period)} title="Click to reword" className="text-left text-2xl leading-snug text-white">{p.intention.body}</button>
                    {p.intention.result && <p className="mt-1 text-lg text-zinc-400">{outcome(p.intention)}</p>}
                  </div>
                )}
                <span className="text-sm text-zinc-400">{p.daysLeft === 0 ? 'ends today' : `${p.daysLeft} day${p.daysLeft === 1 ? '' : 's'} left`}</span>
                {/* How much of the period is gone. */}
                <div className="home-time col-span-2 col-start-3" role="img" aria-label={`${length - p.daysLeft} of ${length} days gone`}><i style={{ width: `${((length - p.daysLeft) / length) * 100}%` }} /></div>
                {p.intention && !p.intention.result && p.daysLeft === 0 && editing !== p.period && (
                  <div className="col-span-2 col-start-3"><Review intention={p.intention} onReviewed={load} onError={setError} /></div>
                )}
              </div>
            );
          })}
        </section>

        <div className="mt-16"><Tracker home={home} /></div>
      </div>
    </div>
  );
}
