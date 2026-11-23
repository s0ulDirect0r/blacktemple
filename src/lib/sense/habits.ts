import { randomUUID } from 'node:crypto';
import { membershipDatabase } from '@/lib/membership/database';
import { MemberError } from '@/lib/membership/errors';
import { isDate } from './periods';
import { cleanDescription, cleanName } from './projects';

/** Habits in Sense: each has a name, a description and the days it was done. Owner only. */

export interface SenseHabit { id: string; name: string; description: string; createdAt: string; /** Every day it was done, as YYYY-MM-DD, oldest first. */ days: string[] }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function habitId(value: string) {
  if (!UUID.test(value)) throw new MemberError(404, 'That habit doesn’t exist.');
  return value;
}
function day(value: unknown) {
  if (!isDate(value)) throw new MemberError(400, 'Send the day as YYYY-MM-DD.');
  return value;
}

const SELECT = `SELECT h.id, h.name, h.description, h.created_at,
  COALESCE((SELECT array_agg(to_char(c.day, 'YYYY-MM-DD') ORDER BY c.day) FROM sense_habit_checks c WHERE c.habit_id = h.id), '{}') AS days
  FROM sense_habits h`;
interface Row { id: string; name: string; description: string; created_at: Date; days: string[] }
const toHabit = (row: Row): SenseHabit => ({ id: row.id, name: row.name, description: row.description, createdAt: row.created_at.toISOString(), days: row.days });

/** Oldest first, so habits keep their place on the page. */
export async function listHabits() {
  const { rows } = await membershipDatabase().query<Row>(`${SELECT} ORDER BY h.created_at, h.id`);
  return rows.map(toHabit);
}

async function getHabit(id: string) {
  const { rows } = await membershipDatabase().query<Row>(`${SELECT} WHERE h.id = $1`, [id]);
  if (!rows[0]) throw new MemberError(404, 'That habit doesn’t exist.');
  return toHabit(rows[0]);
}

export async function createHabit(input: Record<string, unknown>) {
  const id = randomUUID();
  await membershipDatabase().query('INSERT INTO sense_habits (id, name, description) VALUES ($1, $2, $3)', [id, cleanName(input.name, 'habit'), cleanDescription(input.description)]);
  return getHabit(id);
}

export async function updateHabit(id: string, input: Record<string, unknown>) {
  const name = input.name === undefined ? null : cleanName(input.name, 'habit');
  const description = input.description === undefined ? null : cleanDescription(input.description);
  await membershipDatabase().query('UPDATE sense_habits SET name = COALESCE($2, name), description = COALESCE($3, description) WHERE id = $1', [habitId(id), name, description]);
  return getHabit(id);
}

/** Deletes the habit and its whole history. */
export async function deleteHabit(id: string) {
  await membershipDatabase().query('DELETE FROM sense_habits WHERE id = $1', [habitId(id)]);
}

/** Mark the habit done on a day, or take that back. Doing it twice changes nothing. */
export async function checkHabit(id: string, dayInput: unknown, done: boolean) {
  const date = day(dayInput);
  if (done) {
    const { rowCount } = await membershipDatabase().query(
      'INSERT INTO sense_habit_checks (habit_id, day) SELECT id, $2 FROM sense_habits WHERE id = $1 ON CONFLICT DO NOTHING RETURNING day', [habitId(id), date]);
    if (!rowCount) return getHabit(id);   // already done, or no such habit (getHabit says which)
  } else {
    await membershipDatabase().query('DELETE FROM sense_habit_checks WHERE habit_id = $1 AND day = $2', [habitId(id), date]);
  }
  return getHabit(id);
}
