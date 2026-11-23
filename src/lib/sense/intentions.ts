import { randomUUID } from 'node:crypto';
import { membershipDatabase } from '@/lib/membership/database';
import { MemberError } from '@/lib/membership/errors';
import { safeTimeZone } from './jev';
import { PERIODS, addDays, daysBetween, isDate, isPeriod, periodRange, previousRange, type Period } from './periods';

/**
 * Sense Home: an intention for each day, week, month, quarter and year, reviewed when the period ends,
 * and a year-long count of what was closed each day. Owner only.
 */

export type Result = 'yes' | 'partly' | 'no';
export interface Intention { id: string; period: Period; start: string; body: string; result: Result | null; note: string }
export interface HomePeriod {
  period: Period; start: string; end: string; daysLeft: number;
  intention: Intention | null;
  /** The period before this one, if its intention was set and never reviewed. */
  unreviewed: Intention | null;
}

interface Row { id: string; period: Period; period_start: string; body: string; result: Result | null; note: string }
const COLUMNS = `id, period, to_char(period_start, 'YYYY-MM-DD') AS period_start, body, result, note`;
const toIntention = (row: Row): Intention => ({ id: row.id, period: row.period, start: row.period_start, body: row.body, result: row.result, note: row.note });

function today(value: unknown) {
  if (!isDate(value)) throw new MemberError(400, 'Send today’s date as YYYY-MM-DD.');
  return value;
}

/** What "closed" means on the tracker: a task ticked off, an intention set, a review done, a habit done, someone talked with. Each as (when, kind, text). */
const CLOSED = `
  SELECT t.done_at AS at, 'task' AS kind, t.body AS text, p.name AS context FROM sense_project_tasks t JOIN sense_projects p ON p.id = t.project_id WHERE t.done_at IS NOT NULL
  UNION ALL SELECT created_at, 'intention', body, period FROM sense_intentions
  UNION ALL SELECT reviewed_at, 'review', body, period FROM sense_intentions WHERE reviewed_at IS NOT NULL
  UNION ALL SELECT c.created_at, 'habit', h.name, '' FROM sense_habit_checks c JOIN sense_habits h ON h.id = c.habit_id
  UNION ALL SELECT c.created_at, 'talked', p.name, '' FROM sense_people_contacts c JOIN sense_people p ON p.id = c.person_id`;

export async function homeFor(dateInput: unknown, zoneInput: unknown) {
  const date = today(dateInput), zone = safeTimeZone(zoneInput);
  const db = membershipDatabase();
  const ranges = PERIODS.map(period => ({ period, now: periodRange(period, date), before: previousRange(period, date) }));
  const keys = ranges.flatMap(r => [`${r.period}:${r.now.start}`, `${r.period}:${r.before.start}`]);
  const [intentions, counts] = await Promise.all([
    db.query<Row>(`SELECT ${COLUMNS} FROM sense_intentions WHERE period || ':' || to_char(period_start, 'YYYY-MM-DD') = ANY($1)`, [keys]),
    db.query<{ day: string; count: string }>(
      `SELECT to_char((at AT TIME ZONE $1)::date, 'YYYY-MM-DD') AS day, count(*) FROM (${CLOSED}) closed
       WHERE (at AT TIME ZONE $1)::date BETWEEN $2::date AND $3::date GROUP BY 1`, [zone, addDays(date, -364), date]),
  ]);
  const found = new Map(intentions.rows.map(row => [`${row.period}:${row.period_start}`, toIntention(row)]));
  const periods: HomePeriod[] = ranges.map(r => {
    const before = found.get(`${r.period}:${r.before.start}`);
    return { period: r.period, start: r.now.start, end: r.now.end, daysLeft: daysBetween(date, r.now.end),
      intention: found.get(`${r.period}:${r.now.start}`) ?? null, unreviewed: before && !before.result ? before : null };
  });
  return { date, periods, closed: Object.fromEntries(counts.rows.map(row => [row.day, Number(row.count)])) };
}

/** Everything closed on one day, oldest first. */
export async function closedOn(dateInput: unknown, zoneInput: unknown) {
  const date = today(dateInput), zone = safeTimeZone(zoneInput);
  const { rows } = await membershipDatabase().query<{ kind: 'task' | 'intention' | 'review' | 'habit' | 'talked'; text: string; context: string }>(
    `SELECT kind, text, context FROM (${CLOSED}) closed WHERE (at AT TIME ZONE $1)::date = $2::date ORDER BY at`, [zone, date]);
  return { date, items: rows };
}

/** Set or reword the intention for the period that holds `date`. */
export async function setIntention(input: Record<string, unknown>) {
  if (!isPeriod(input.period)) throw new MemberError(400, 'Choose day, week, month, quarter or year.');
  const body = typeof input.body === 'string' ? input.body.replace(/\s+/g, ' ').trim() : '';
  if (!body) throw new MemberError(400, 'Write the intention first.');
  if (body.length > 500) throw new MemberError(400, 'Keep an intention under 500 characters.');
  const { start } = periodRange(input.period, today(input.date));
  const { rows } = await membershipDatabase().query<Row>(
    `INSERT INTO sense_intentions (id, period, period_start, body) VALUES ($1, $2, $3, $4)
     ON CONFLICT (period, period_start) DO UPDATE SET body = EXCLUDED.body RETURNING ${COLUMNS}`, [randomUUID(), input.period, start, body]);
  return toIntention(rows[0]);
}

/** Say how it went. The first review sets the time it counts on the tracker; later edits keep it. */
export async function reviewIntention(id: string, input: Record<string, unknown>) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new MemberError(404, 'That intention doesn’t exist.');
  if (input.result !== 'yes' && input.result !== 'partly' && input.result !== 'no') throw new MemberError(400, 'Say whether it happened, partly happened or didn’t.');
  const note = typeof input.note === 'string' ? input.note.trim() : '';
  if (note.length > 2000) throw new MemberError(400, 'Keep the note under 2,000 characters.');
  const { rows } = await membershipDatabase().query<Row>(
    `UPDATE sense_intentions SET result = $2, note = $3, reviewed_at = COALESCE(reviewed_at, NOW()) WHERE id = $1 RETURNING ${COLUMNS}`, [id, input.result, note]);
  if (!rows[0]) throw new MemberError(404, 'That intention doesn’t exist.');
  return toIntention(rows[0]);
}
