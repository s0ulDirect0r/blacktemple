'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './membership.module.css';

type Booking = { id: string; starts_at: string; focus: 'desire' | 'creative'; status: string; meet_url: string | null };
type State = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; slots: Date[]; bookings: Booking[] };
const FOCUS = { desire: 'Desire Confessional', creative: 'Creative championing' } as const;

/** Champion conversation picker: choose a day and time from the shared calendar, then book it directly. */
export default function ConversationBooking() {
  const [timeZone, setTimeZone] = useState('UTC');
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [day, setDay] = useState<string | null>(null), [slot, setSlot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const response = await fetch('/api/members/conversations', { cache: 'no-store' });
      if (response.status === 401) { window.location.replace('/login?next=/members/conversations'); return; }
      const data = await response.json();
      if (!response.ok) { setState({ kind: 'error', message: data.error || 'Open times could not be loaded.' }); return; }
      setState({ kind: 'ready', slots: (data.slots as string[]).map(iso => new Date(iso)), bookings: data.bookings });
    } catch { setState({ kind: 'error', message: 'Open times could not be reached. Please try again.' }); }
  }, []);
  useEffect(() => { setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'); load(); }, [load]);

  const format = (date: Date, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone, ...options }).format(date);
  const days = useMemo(() => {
    if (state.kind !== 'ready') return [];
    const byDay = new Map<string, Date[]>();
    for (const date of state.slots) {
      const key = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
      byDay.set(key, [...(byDay.get(key) ?? []), date]);
    }
    return [...byDay.entries()].map(([key, slots]) => ({ key, slots }));
  }, [state, timeZone]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!slot) return;
    setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/members/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ start: slot, focus: form.get('focus'), note: form.get('note') }) });
      if (response.status === 401) { window.location.replace('/login?next=/members/conversations'); return; }
      const data = await response.json();
      if (!response.ok) { setError(data.error || 'The conversation could not be booked.'); if (response.status === 409) { setSlot(null); load(); } return; }
      setSlot(null); setDay(null); await load();
    } catch { setError('The booking could not be reached. Please try again.'); }
    finally { setBusy(false); }
  }

  if (state.kind === 'loading') return <p className={styles.note} style={{ marginTop: 28 }}>Loading open times…</p>;
  if (state.kind === 'error') return <div style={{ marginTop: 28 }}><p role="alert" className={styles.error}>{state.message}</p><button type="button" className={styles.secondary} onClick={load}>Try again</button></div>;
  const upcoming = state.bookings.filter(booking => new Date(booking.starts_at).getTime() > Date.now() - 2 * 3600_000);
  const selectedDay = days.find(entry => entry.key === day);
  return <div style={{ marginTop: 28 }}>
    {upcoming.length > 0 && <section aria-labelledby="booked-heading" className={styles.panel} style={{ marginBottom: 28 }}>
      <h3 id="booked-heading" className={styles.eyebrow}>Booked</h3>
      {upcoming.map(booking => <p key={booking.id} className={styles.prose} style={{ marginTop: 12 }}>
        {FOCUS[booking.focus]} · {format(new Date(booking.starts_at), { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
        {booking.meet_url ? <> · <a className={styles.textLink} href={booking.meet_url} rel="noreferrer">Meet link ↗</a></> : booking.status === 'booking' ? ' · confirming…' : null}
      </p>)}
      <p className={styles.note} style={{ marginTop: 12 }}>A calendar invitation was sent to your account email.</p>
    </section>}
    {days.length === 0 ? <p className={styles.note}>No open times in the next few weeks. Check back soon.</p> : <>
      <p className={styles.note}>Times shown in {timeZone.replace(/_/g, ' ')}.</p>
      <fieldset style={{ border: 0, padding: 0, marginTop: 18 }}><legend className={styles.note}>Day</legend>
        <div className={styles.slotGrid}>{days.map(entry => <button key={entry.key} type="button" className={styles.slot} aria-pressed={entry.key === day} onClick={() => { setDay(entry.key); setSlot(null); }}>{format(entry.slots[0], { weekday: 'short', month: 'short', day: 'numeric' })}</button>)}</div>
      </fieldset>
      {selectedDay && <fieldset style={{ border: 0, padding: 0, marginTop: 22 }}><legend className={styles.note}>Time</legend>
        <div className={styles.slotGrid}>{selectedDay.slots.map(date => <button key={date.toISOString()} type="button" className={styles.slot} aria-pressed={slot === date.toISOString()} onClick={() => setSlot(date.toISOString())}>{format(date, { hour: 'numeric', minute: '2-digit' })}</button>)}</div>
      </fieldset>}
      {slot && <form onSubmit={submit} className={styles.form} style={{ marginTop: 28 }}>
        <p className={styles.prose}>{format(new Date(slot), { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
        <label>What kind of conversation?<select name="focus" defaultValue="desire"><option value="desire">{FOCUS.desire}</option><option value="creative">{FOCUS.creative}</option></select></label>
        <label>Anything you&apos;d like me to know beforehand? (optional)<textarea name="note" maxLength={2000} rows={4} /></label>
        <button type="submit" className={styles.button} disabled={busy}>{busy ? 'Booking…' : 'Book this time ↗'}</button>
      </form>}
    </>}
    {error && <p role="alert" className={styles.error} style={{ marginTop: 16 }}>{error}</p>}
  </div>;
}
