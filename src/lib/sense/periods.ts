/** Calendar rules for intentions. Dates are plain `YYYY-MM-DD` strings in Matthew's own time zone; no clock is involved. */

export const PERIODS = ['year', 'quarter', 'month', 'week', 'day'] as const;
export type Period = (typeof PERIODS)[number];

const DAY = 86_400_000;
const utc = (date: string) => Date.parse(`${date}T00:00:00Z`);
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** A real calendar date, e.g. not 2026-02-30. */
export function isDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(utc(value)) && iso(utc(value)) === value;
}

export function isPeriod(value: unknown): value is Period {
  return (PERIODS as readonly unknown[]).includes(value);
}

export function addDays(date: string, days: number) {
  return iso(utc(date) + days * DAY);
}

/** The first and last day of the period that holds `date`. Weeks run Monday to Sunday. */
export function periodRange(period: Period, date: string): { start: string; end: string } {
  const d = new Date(utc(date));
  const y = d.getUTCFullYear(), m = d.getUTCMonth();
  if (period === 'day') return { start: date, end: date };
  if (period === 'week') { const start = addDays(date, -((d.getUTCDay() + 6) % 7)); return { start, end: addDays(start, 6) }; }
  const first = period === 'year' ? 0 : period === 'quarter' ? m - (m % 3) : m;
  const months = period === 'year' ? 12 : period === 'quarter' ? 3 : 1;
  return { start: iso(Date.UTC(y, first, 1)), end: iso(Date.UTC(y, first + months, 0)) };
}

/** The period just before the one that holds `date`. */
export function previousRange(period: Period, date: string) {
  return periodRange(period, addDays(periodRange(period, date).start, -1));
}

export function daysBetween(from: string, to: string) {
  return Math.round((utc(to) - utc(from)) / DAY);
}

/** The run of days ending today (or yesterday, if today isn't done yet), the longest run ever, and the total. */
export function streaks(days: string[], today: string) {
  const done = new Set(days);
  const step = addDays;
  let current = 0;
  for (let d = done.has(today) ? today : step(today, -1); done.has(d); d = step(d, -1)) current++;
  let best = 0, run = 0, last = '';
  for (const d of [...done].sort()) { run = last && step(last, 1) === d ? run + 1 : 1; best = Math.max(best, run); last = d; }
  return { current, best, total: done.size };
}

/** Days until it is time to be in touch again: negative when overdue, null with no rhythm. Someone never talked to is due now. */
export function dueIn(person: { cadenceDays: number | null; lastTalked: string | null }, today: string) {
  if (!person.cadenceDays) return null;
  if (!person.lastTalked) return 0;
  return person.cadenceDays - daysBetween(person.lastTalked, today);
}
