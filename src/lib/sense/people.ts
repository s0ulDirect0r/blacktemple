import { randomUUID } from 'node:crypto';
import { membershipDatabase } from '@/lib/membership/database';
import { MemberError } from '@/lib/membership/errors';
import { normalizeEmail, normalizePhone, normalizeTelegram } from './contact';
import { isDate } from './periods';
import { cleanName } from './projects';

/** People in Sense: a name, a running note, how often to be in touch, and the last day we talked. Owner only. */

export interface SensePerson {
  id: string; name: string; note: string;
  /** Be in touch at least this often, in days. Null: no rhythm set. */
  cadenceDays: number | null;
  /** The last day we talked, as YYYY-MM-DD. */
  lastTalked: string | null;
  /** International form, e.g. +12055550142. */
  phone: string | null;
  /** Telegram username, without the @. */
  telegram: string | null;
  email: string | null;
  createdAt: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function personId(value: string) {
  if (!UUID.test(value)) throw new MemberError(404, 'That person isn’t here.');
  return value;
}

export function cleanNote(value: unknown) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw new MemberError(400, 'The note should be text.');
  const note = value.replace(/\r\n/g, '\n').trimEnd();
  if (note.length > 50000) throw new MemberError(400, 'That note is too long.');
  return note;
}

export function cleanCadence(value: unknown) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 365) throw new MemberError(400, 'Choose a rhythm between 1 and 365 days.');
  return value;
}

export { dueIn } from './periods';

/** Blank clears it; anything else must read as a phone number. */
export function cleanPhone(value: unknown) {
  if (value === undefined || value === null || value === '') return null;
  const phone = typeof value === 'string' ? normalizePhone(value) : null;
  if (!phone) throw new MemberError(400, 'That doesn’t look like a phone number. Include the country code, like +1 205 555 0142.');
  return phone;
}

/** Blank clears it; anything else must read as a Telegram username. */
export function cleanTelegram(value: unknown) {
  if (value === undefined || value === null || value === '') return null;
  const name = typeof value === 'string' ? normalizeTelegram(value) : null;
  if (!name) throw new MemberError(400, 'That doesn’t look like a Telegram username.');
  return name;
}

/** Blank clears it; anything else must read as an email address. */
export function cleanEmail(value: unknown) {
  if (value === undefined || value === null || value === '') return null;
  const email = typeof value === 'string' ? normalizeEmail(value) : null;
  if (!email) throw new MemberError(400, 'That doesn’t look like an email address.');
  return email;
}

const SELECT = `SELECT p.id, p.name, p.note, p.cadence_days, p.phone, p.telegram, p.email, p.created_at,
  (SELECT to_char(max(c.day), 'YYYY-MM-DD') FROM sense_people_contacts c WHERE c.person_id = p.id) AS last_talked FROM sense_people p`;
interface Row { id: string; name: string; note: string; cadence_days: number | null; phone: string | null; telegram: string | null; email: string | null; created_at: Date; last_talked: string | null }
const toPerson = (row: Row): SensePerson => ({ id: row.id, name: row.name, note: row.note, cadenceDays: row.cadence_days, lastTalked: row.last_talked, phone: row.phone, telegram: row.telegram, email: row.email, createdAt: row.created_at.toISOString() });

export async function listPeople() {
  const { rows } = await membershipDatabase().query<Row>(`${SELECT} ORDER BY p.name, p.id`);
  return rows.map(toPerson);
}

async function getPerson(id: string) {
  const { rows } = await membershipDatabase().query<Row>(`${SELECT} WHERE p.id = $1`, [id]);
  if (!rows[0]) throw new MemberError(404, 'That person isn’t here.');
  return toPerson(rows[0]);
}

export async function createPerson(input: Record<string, unknown>) {
  const id = randomUUID();
  await membershipDatabase().query('INSERT INTO sense_people (id, name, note, cadence_days, phone, telegram, email) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [id, cleanName(input.name, 'person'), cleanNote(input.note), cleanCadence(input.cadenceDays), cleanPhone(input.phone), cleanTelegram(input.telegram), cleanEmail(input.email)]);
  return getPerson(id);
}

/** Change any of the name, the note, the rhythm, the phone number, the Telegram username and the email. Null clears the last four. */
export async function updatePerson(id: string, input: Record<string, unknown>) {
  personId(id);
  const sets: string[] = [], values: unknown[] = [id];
  const set = (column: string, value: unknown) => { values.push(value); sets.push(`${column} = $${values.length}`); };
  if (input.name !== undefined) set('name', cleanName(input.name, 'person'));
  if (input.note !== undefined) set('note', cleanNote(input.note));
  if (input.cadenceDays !== undefined) set('cadence_days', cleanCadence(input.cadenceDays));
  if (input.phone !== undefined) set('phone', cleanPhone(input.phone));
  if (input.telegram !== undefined) set('telegram', cleanTelegram(input.telegram));
  if (input.email !== undefined) set('email', cleanEmail(input.email));
  if (sets.length) await membershipDatabase().query(`UPDATE sense_people SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $1`, values);
  return getPerson(id);
}

/** Removes the person, their note and their history. */
export async function deletePerson(id: string) {
  await membershipDatabase().query('DELETE FROM sense_people WHERE id = $1', [personId(id)]);
}

/** Record that we talked on a day, or take that back. */
export async function markTalked(id: string, day: unknown, talked: boolean) {
  if (!isDate(day)) throw new MemberError(400, 'Send the day as YYYY-MM-DD.');
  if (talked) await membershipDatabase().query('INSERT INTO sense_people_contacts (person_id, day) SELECT id, $2 FROM sense_people WHERE id = $1 ON CONFLICT DO NOTHING', [personId(id), day]);
  else await membershipDatabase().query('DELETE FROM sense_people_contacts WHERE person_id = $1 AND day = $2', [personId(id), day]);
  return getPerson(id);
}
