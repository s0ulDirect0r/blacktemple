'use client';

import { useEffect, useState } from 'react';
import type { SenseHabit } from '@/lib/sense/habits';
import { addDays, streaks } from '@/lib/sense/periods';
import { sense } from './api';
import { CountUp, chime, setSound, soundOn } from './juice';

const field = 'w-full rounded-md border border-violet-300/35 bg-black/60 px-4 py-3 text-xl text-zinc-100 placeholder:text-zinc-600 focus:border-violet-300 focus:outline-none';
const quiet = 'rounded border border-white/15 px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/10';
const primary = 'rounded border border-violet-300/40 bg-violet-300/10 px-4 py-2 text-base font-medium text-violet-100 hover:bg-violet-300/20 disabled:opacity-50';
const message = (e: unknown) => (e instanceof Error ? e.message : 'That didn’t work. Try again.');

/** Today's date where you are, as YYYY-MM-DD. */
function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
const at = (date: string) => new Date(`${date}T12:00:00`);
const fmt = (date: string, options: Intl.DateTimeFormatOptions) => at(date).toLocaleDateString([], options);

function NewHabit({ onCreated, onCancel }: { onCreated: (habit: SenseHabit) => void; onCancel?: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError('');
    try { onCreated(await sense<SenseHabit>('/habits', { method: 'POST', body: JSON.stringify({ name, description }) })); }
    catch (e) { setError(message(e)); setBusy(false); }
  };
  return (
    <form onSubmit={create} className="space-y-3 rounded-xl border border-violet-300/30 bg-black/50 p-6" aria-label="New habit">
      <p className="sense-eyebrow">New habit</p>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Name, e.g. Meditate" aria-label="Habit name" autoFocus maxLength={120} className={field} />
      <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional): what counts as doing it" aria-label="Habit description" rows={2} className={`${field} resize-y`} />
      <div className="flex items-center gap-2">
        <button type="submit" disabled={busy || !name.trim()} className={primary}>{busy ? 'Creating…' : 'Create habit'}</button>
        {onCancel && <button type="button" onClick={onCancel} className={quiet}>Cancel</button>}
        {error && <span role="alert" className="text-sm text-red-300">{error}</span>}
      </div>
    </form>
  );
}

/** A year of days for one habit, one column per week: lit when it was done. */
function Chain({ days, today }: { days: Set<string>; today: string }) {
  const first = addDays(today, -364);
  const year = Array.from({ length: 365 }, (_, i) => addDays(first, i));
  const lead = at(first).getDay();
  const weeks = Math.ceil((lead + 365) / 7);
  const monthAt = (week: number) => { const d = year[week * 7 - lead]; return d && Number(d.slice(8)) <= 7 ? fmt(d, { month: 'short' }) : ''; };
  const columns = { gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` };
  return (
    <div className="sense-scroll overflow-x-auto pb-1">
      <div className="min-w-[640px]">
        <div className="grid gap-[3px] text-sm text-zinc-500" style={columns}>
          {Array.from({ length: weeks }, (_, w) => <span key={w} className="h-6 overflow-visible whitespace-nowrap">{monthAt(w)}</span>)}
        </div>
        <div className="grid grid-flow-col grid-rows-[repeat(7,auto)] gap-[3px]" style={columns} role="img" aria-label={`Done on ${days.size} days`}>
          {Array.from({ length: lead }, (_, i) => <span key={i} />)}
          {year.map((d, i) => (
            // Today's square is re-made when it flips, so its pop plays again.
            <span key={d === today ? `${d}:${days.has(d)}` : d} title={`${fmt(d, { month: 'short', day: 'numeric' })}${days.has(d) ? ': done' : ''}`}
              style={{ '--d': `${Math.floor((lead + i) / 7) * 11}ms` } as React.CSSProperties}
              className={`home-cell aspect-square w-full rounded-sm ${days.has(d) ? 'habit-cell-on' : 'bg-zinc-900'} ${d === today ? 'today outline outline-1 outline-offset-1 outline-white' : ''}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

function HabitCard({ habit, today, onChange, onDeleted }: { habit: SenseHabit; today: string; onChange: (habit: SenseHabit) => void; onDeleted: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(habit.name);
  const [description, setDescription] = useState(habit.description);
  const [confirming, setConfirming] = useState(false);
  const [burst, setBurst] = useState(false);
  const [error, setError] = useState('');

  const days = new Set(habit.days);
  const done = days.has(today);
  const { current, best, total } = streaks(habit.days, today);

  /** Mark today done (or take it back). The page updates at once; the save follows. */
  const check = (next: boolean) => {
    const before = habit;
    const optimistic = { ...habit, days: next ? [...habit.days.filter(d => d !== today), today] : habit.days.filter(d => d !== today) };
    onChange(optimistic);
    setError('');
    if (next) { chime(streaks(optimistic.days, today).current); setBurst(true); setTimeout(() => setBurst(false), 1000); }
    sense<SenseHabit>(`/habits/${habit.id}/check`, { method: 'POST', body: JSON.stringify({ day: today, done: next }) }).then(onChange)
      .catch(e => { onChange(before); setError(message(e)); });
  };
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    sense<SenseHabit>(`/habits/${habit.id}`, { method: 'PATCH', body: JSON.stringify({ name, description }) }).then(h => { onChange(h); setEditing(false); }).catch(e => setError(message(e)));
  };

  return (
    <article className={`habit-card p-6 lg:p-8 ${done ? 'done' : ''} ${burst ? 'burst' : ''}`} aria-label={habit.name}>
      {editing ? (
        <form onSubmit={save} className="space-y-3">
          <input value={name} onChange={e => setName(e.target.value)} aria-label="Habit name" autoFocus maxLength={120} className={field} />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" aria-label="Habit description" rows={2} className={`${field} resize-y`} />
          <div className="flex gap-2">
            <button type="submit" disabled={!name.trim()} className={primary}>Save</button>
            <button type="button" onClick={() => { setName(habit.name); setDescription(habit.description); setEditing(false); }} className={quiet}>Cancel</button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-3xl font-medium leading-tight text-white">{habit.name}</h2>
            {habit.description && <p className="mt-2 whitespace-pre-wrap text-lg leading-relaxed text-zinc-400">{habit.description}</p>}
          </div>
          {done ? (
            <div className="flex-none text-right">
              <p className="text-2xl font-semibold text-amber-300">✓ Done today</p>
              <button type="button" onClick={() => check(false)} className="mt-1 text-sm text-zinc-500 underline hover:text-zinc-300">Undo</button>
            </div>
          ) : (
            <button type="button" onClick={() => check(true)} className="habit-do flex-none">I did it</button>
          )}
        </div>
      )}

      <dl className="mt-7 flex flex-wrap gap-x-14 gap-y-4">
        {[[current, current === 1 ? 'day in a row' : 'days in a row'], [best, 'longest chain'], [total, 'days done']].map(([n, what], i) => (
          <div key={i}><dd className={`home-num text-4xl ${i === 0 && current > 0 ? 'text-amber-300' : 'text-white'}`}><CountUp value={n as number} /></dd><dt className="mt-3 text-base text-zinc-500">{what}</dt></div>
        ))}
      </dl>

      <div className="mt-6"><Chain days={days} today={today} /></div>

      {!editing && (
        <div className="mt-5 flex items-center gap-2">
          {confirming ? (
            <>
              <span className="text-sm text-zinc-300">Delete this habit and its {total} day{total === 1 ? '' : 's'} of history?</span>
              <button type="button" onClick={() => sense(`/habits/${habit.id}`, { method: 'DELETE' }).then(onDeleted).catch(e => setError(message(e)))} className="rounded border border-red-300/40 px-3 py-1.5 text-sm text-red-200 hover:bg-red-400/10">Delete</button>
              <button type="button" onClick={() => setConfirming(false)} className={quiet}>Cancel</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => { setName(habit.name); setDescription(habit.description); setEditing(true); }} className={quiet}>Edit</button>
              <button type="button" onClick={() => setConfirming(true)} className={quiet}>Delete</button>
            </>
          )}
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
    </article>
  );
}

/** The Habits view: each habit has a year-long chain. "I did it" lights today's square with a chime and a burst. */
export default function SenseHabits() {
  const [habits, setHabits] = useState<SenseHabit[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [sound, setSoundState] = useState(true);
  const [error, setError] = useState('');
  const today = localToday();

  useEffect(() => {
    sense<{ habits: SenseHabit[] }>('/habits').then(r => { setHabits(r.habits); setSoundState(soundOn()); }).catch(e => setError(message(e)));
  }, []);

  const replace = (habit: SenseHabit) => setHabits(list => list?.map(h => (h.id === habit.id ? habit : h)) ?? null);

  return (
    <div className="sense-scroll h-full overflow-y-auto px-6 py-8 lg:px-10 [&_.sense-eyebrow]:text-[10px]">
      <div className="mx-auto max-w-6xl space-y-6">
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        {habits && (
          <div className="flex items-center gap-3">
            {!adding && habits.length > 0 && <button type="button" onClick={() => setAdding(true)} className={primary}>+ New habit</button>}
            <button type="button" aria-pressed={sound} onClick={() => { setSound(!sound); setSoundState(!sound); if (!sound) setTimeout(() => chime(1), 0); }} className={`${quiet} ml-auto`}>Sound: {sound ? 'on' : 'off'}</button>
          </div>
        )}
        {habits && (adding || habits.length === 0) && (
          <NewHabit onCreated={habit => { setHabits(list => [...(list ?? []), habit]); setAdding(false); }} onCancel={habits.length ? () => setAdding(false) : undefined} />
        )}
        {habits?.map(habit => (
          <HabitCard key={habit.id} habit={habit} today={today} onChange={replace} onDeleted={() => setHabits(list => list?.filter(h => h.id !== habit.id) ?? null)} />
        ))}
      </div>
    </div>
  );
}
