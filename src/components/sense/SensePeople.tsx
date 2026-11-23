'use client';

import { useEffect, useRef, useState } from 'react';
import { contactLinks } from '@/lib/sense/contact';
import type { SensePerson } from '@/lib/sense/people';
import { daysBetween, dueIn } from '@/lib/sense/periods';
import { sense } from './api';
import { chime } from './juice';

const field = 'w-full rounded-md border border-violet-300/35 bg-black/60 px-4 py-3 text-xl text-zinc-100 placeholder:text-zinc-600 focus:border-violet-300 focus:outline-none';
const quiet = 'rounded border border-white/15 px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/10';
const primary = 'rounded border border-violet-300/40 bg-violet-300/10 px-4 py-2 text-base font-medium text-violet-100 hover:bg-violet-300/20 disabled:opacity-50';
const message = (e: unknown) => (e instanceof Error ? e.message : 'That didn’t work. Try again.');

/** How often to be in touch. The value is days; 0 means no rhythm. */
const RHYTHMS: [number, string][] = [[0, 'No rhythm'], [7, 'Every week'], [14, 'Every 2 weeks'], [30, 'Every month'], [90, 'Every 3 months'], [180, 'Every 6 months'], [365, 'Every year']];

function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
/**
 * Open a conversation in the real app. In the desktop app every outside link is handed to macOS, so the page stays put;
 * in a browser, web links open in a new tab and `sms:` goes to the system's messaging app.
 */
function openOutside(url: string) {
  const inApp = Boolean((window as { __BLACK_TEMPLE_DESKTOP__?: unknown }).__BLACK_TEMPLE_DESKTOP__);
  if (inApp || !url.startsWith('http')) window.location.href = url;
  else window.open(url, '_blank', 'noopener,noreferrer');
}

const ago = (days: number) => (days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`);

function Rhythm({ value, onChange, label }: { value: number | null; onChange: (days: number | null) => void; label: string }) {
  return (
    <select value={value ?? 0} onChange={e => onChange(Number(e.target.value) || null)} aria-label={label}
      className="rounded border border-white/15 bg-black/60 px-3 py-2 text-base text-zinc-200 focus:border-violet-300 focus:outline-none">
      {RHYTHMS.map(([days, name]) => <option key={days} value={days}>{name}</option>)}
    </select>
  );
}

function NewPerson({ onCreated, onCancel }: { onCreated: (person: SensePerson) => void; onCancel?: () => void }) {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [cadenceDays, setCadence] = useState<number | null>(null);
  const [phone, setPhone] = useState('');
  const [telegram, setTelegram] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError('');
    try { onCreated(await sense<SensePerson>('/people', { method: 'POST', body: JSON.stringify({ name, note, cadenceDays, phone, telegram, email }) })); }
    catch (e) { setError(message(e)); setBusy(false); }
  };
  return (
    <form onSubmit={create} className="space-y-3 rounded-xl border border-violet-300/30 bg-black/50 p-6" aria-label="New person">
      <p className="sense-eyebrow">New person</p>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" aria-label="Person’s name" autoFocus maxLength={120} className={field} />
      <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional): who they are to you, what you last talked about, what to ask next time" aria-label="Note" rows={3} className={`${field} resize-y`} />
      <div className="grid gap-3 lg:grid-cols-3">
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone (optional), e.g. +1 205 555 0142" aria-label="Phone number" inputMode="tel" maxLength={32} className={field} />
        <input value={telegram} onChange={e => setTelegram(e.target.value)} placeholder="Telegram username (optional)" aria-label="Telegram username" maxLength={64} className={field} />
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email (optional)" aria-label="Email address" type="email" maxLength={254} className={field} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-base text-zinc-400">Stay in touch</span>
        <Rhythm value={cadenceDays} onChange={setCadence} label="How often to be in touch" />
      </div>
      <div className="flex items-center gap-2">
        <button type="submit" disabled={busy || !name.trim()} className={primary}>{busy ? 'Adding…' : 'Add person'}</button>
        {onCancel && <button type="button" onClick={onCancel} className={quiet}>Cancel</button>}
        {error && <span role="alert" className="text-sm text-red-300">{error}</span>}
      </div>
    </form>
  );
}

function PersonCard({ person, today, onChange, onDeleted }: { person: SensePerson; today: string; onChange: (person: SensePerson) => void; onDeleted: () => void }) {
  const [note, setNote] = useState(person.note);
  const [saved, setSaved] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(person.name);
  const [phone, setPhone] = useState(person.phone ?? '');
  const [telegram, setTelegram] = useState(person.telegram ?? '');
  const [email, setEmail] = useState(person.email ?? '');
  const [confirming, setConfirming] = useState(false);
  const [burst, setBurst] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const patch = (body: Record<string, unknown>) => sense<SensePerson>(`/people/${person.id}`, { method: 'PATCH', body: JSON.stringify(body) });
  const fail = (e: unknown) => setError(message(e));

  /** The note saves itself a moment after you stop typing. */
  const editNote = (text: string) => {
    setNote(text); setSaved('unsaved');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setSaved('saving');
      patch({ note: text }).then(p => { onChange(p); setSaved(s => (s === 'saving' ? 'saved' : s)); setError(''); }).catch(e => { setSaved('unsaved'); fail(e); });
    }, 900);
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const talkedToday = person.lastTalked === today;
  const talk = (talked: boolean) => {
    setError('');
    if (talked) { chime(3); setBurst(true); setTimeout(() => setBurst(false), 1000); }
    sense<SensePerson>(`/people/${person.id}/talked`, { method: 'POST', body: JSON.stringify({ day: today, talked }) }).then(onChange).catch(fail);
  };

  const links = contactLinks(person);
  const due = dueIn(person, today);
  const overdue = due !== null && due < 0;
  const status = !person.lastTalked ? 'Not talked yet' : `Last talked ${ago(daysBetween(person.lastTalked, today))}`;
  const next = due === null ? '' : talkedToday ? '' : due < 0 ? `${-due} day${due === -1 ? '' : 's'} overdue` : due === 0 ? 'Time to reach out' : `Due in ${due} day${due === 1 ? '' : 's'}`;

  return (
    <article className={`habit-card p-6 lg:p-8 ${talkedToday ? 'done' : ''} ${burst ? 'burst' : ''}`} aria-label={person.name}>
      <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
        <div className="min-w-0 flex-1">
          {renaming ? (
            <form onSubmit={e => { e.preventDefault(); patch({ name, phone, telegram, email }).then(p => { onChange(p); setRenaming(false); setError(''); }).catch(fail); }} className="space-y-3">
              <input value={name} onChange={e => setName(e.target.value)} aria-label="Person’s name" autoFocus maxLength={120} className={field} />
              <div className="grid gap-3 lg:grid-cols-3">
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone, e.g. +1 205 555 0142" aria-label="Phone number" inputMode="tel" maxLength={32} className={field} />
                <input value={telegram} onChange={e => setTelegram(e.target.value)} placeholder="Telegram username" aria-label="Telegram username" maxLength={64} className={field} />
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" aria-label="Email address" type="email" maxLength={254} className={field} />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={!name.trim()} className={primary}>Save</button>
                <button type="button" onClick={() => { setRenaming(false); setError(''); }} className={quiet}>Cancel</button>
              </div>
            </form>
          ) : (
            <h2 className="text-3xl font-medium leading-tight text-white">{person.name}</h2>
          )}
          <p className="mt-2 text-lg text-zinc-400">
            {status}{next && <> · <span className={overdue || due === 0 ? 'font-medium text-amber-300' : ''}>{next}</span></>}
          </p>
        </div>
        {talkedToday ? (
          <div className="flex-none text-right">
            <p className="text-2xl font-semibold text-amber-300">✓ Talked today</p>
            <button type="button" onClick={() => talk(false)} className="mt-1 text-sm text-zinc-500 underline hover:text-zinc-300">Undo</button>
          </div>
        ) : (
          <button type="button" onClick={() => talk(true)} className="habit-do flex-none !animate-none">We talked today</button>
        )}
      </div>

      {links.length > 0 && !renaming && (
        <div className="mt-5 flex flex-wrap items-center gap-2" aria-label={`Message ${person.name}`}>
          <span className="mr-1 text-base text-zinc-500">Reach out by</span>
          {links.map(link => (
            <button key={link.app} type="button" onClick={() => openOutside(link.url)} title={link.app === 'Email' ? `Start an email to ${person.name}` : `Open your ${link.app} conversation with ${person.name}`}
              className="rounded-md border border-[#b9f5ff]/40 bg-[#b9f5ff]/10 px-4 py-2 text-base font-medium text-[#d8fbff] hover:bg-[#b9f5ff]/20">{link.app}</button>
          ))}
        </div>
      )}

      <div className="mt-5">
        <textarea value={note} onChange={e => editNote(e.target.value)} rows={Math.min(14, Math.max(3, note.split('\n').length + 1))} aria-label={`Note about ${person.name}`}
          placeholder="Note: who they are to you, what you last talked about, what to ask next time" className={`${field} resize-y !text-lg leading-relaxed`} />
        <p className="mt-1 text-xs text-zinc-600" aria-live="polite">{saved === 'saved' ? 'Saved' : saved === 'saving' ? 'Saving…' : 'Not saved yet'}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Rhythm value={person.cadenceDays} onChange={days => patch({ cadenceDays: days }).then(onChange).catch(fail)} label={`How often to be in touch with ${person.name}`} />
        <span className="flex-1" />
        {confirming ? (
          <>
            <span className="text-sm text-zinc-300">Remove {person.name} and this note?</span>
            <button type="button" onClick={() => sense(`/people/${person.id}`, { method: 'DELETE' }).then(onDeleted).catch(fail)} className="rounded border border-red-300/40 px-3 py-1.5 text-sm text-red-200 hover:bg-red-400/10">Remove</button>
            <button type="button" onClick={() => setConfirming(false)} className={quiet}>Cancel</button>
          </>
        ) : (
          <>
            {!renaming && <button type="button" onClick={() => { setName(person.name); setPhone(person.phone ?? ''); setTelegram(person.telegram ?? ''); setEmail(person.email ?? ''); setRenaming(true); }} className={quiet}>{links.length ? 'Edit' : 'Edit · add contact details'}</button>}
            <button type="button" onClick={() => setConfirming(true)} className={quiet}>Remove</button>
          </>
        )}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
    </article>
  );
}

/**
 * The People view: everyone you want to keep up with, each with a running note. Whoever is most overdue comes first,
 * so the page answers "who should I reach out to?" without you having to hold it in your head.
 */
export default function SensePeople() {
  const [people, setPeople] = useState<SensePerson[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const today = localToday();

  useEffect(() => { sense<{ people: SensePerson[] }>('/people').then(r => setPeople(r.people)).catch(e => setError(message(e))); }, []);

  const replace = (person: SensePerson) => setPeople(list => list?.map(p => (p.id === person.id ? person : p)) ?? null);
  // Most overdue first, then due soonest, then everyone with no rhythm by name.
  const rank = (p: SensePerson) => dueIn(p, today) ?? Number.POSITIVE_INFINITY;
  const sorted = people ? [...people].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name)) : [];
  const waiting = sorted.filter(p => p.lastTalked !== today && (dueIn(p, today) ?? 1) <= 0).length;

  return (
    <div className="sense-scroll h-full overflow-y-auto px-6 py-8 lg:px-10 [&_.sense-eyebrow]:text-[10px]">
      <div className="mx-auto max-w-6xl space-y-6">
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        {people && people.length > 0 && (
          <div className="flex items-center gap-4">
            {!adding && <button type="button" onClick={() => setAdding(true)} className={primary}>+ New person</button>}
            <p className="text-lg text-zinc-400">{waiting === 0 ? 'Nobody is waiting on you.' : `${waiting} ${waiting === 1 ? 'person' : 'people'} to reach out to.`}</p>
          </div>
        )}
        {people && (adding || people.length === 0) && (
          <NewPerson onCreated={person => { setPeople(list => [...(list ?? []), person]); setAdding(false); }} onCancel={people.length ? () => setAdding(false) : undefined} />
        )}
        {sorted.map(person => (
          <PersonCard key={person.id} person={person} today={today} onChange={replace} onDeleted={() => setPeople(list => list?.filter(p => p.id !== person.id) ?? null)} />
        ))}
      </div>
    </div>
  );
}
