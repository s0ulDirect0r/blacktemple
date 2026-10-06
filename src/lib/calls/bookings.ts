// Booking rows in Neon (migrations/006_create_call_bookings.sql). The table's
// exclusion constraint is what stops two people holding the same hour.

import { sql } from '@/lib/db';
import type { Interval } from './slots';

export type BookingStatus = 'held' | 'confirmed' | 'released';

export interface CallBooking {
  id: string;
  startsAt: Date;
  endsAt: Date;
  name: string;
  email: string;
  note: string | null;
  timeZone: string | null;
  status: BookingStatus;
  stripeSessionId: string | null;
  calendarEventId: string | null;
  meetUrl: string | null;
}

interface BookingRow {
  id: string;
  starts_at: string | Date;
  ends_at: string | Date;
  name: string;
  email: string;
  note: string | null;
  time_zone: string | null;
  status: BookingStatus;
  stripe_session_id: string | null;
  calendar_event_id: string | null;
  meet_url: string | null;
}

function toBooking(row: BookingRow): CallBooking {
  return {
    id: row.id,
    startsAt: new Date(row.starts_at),
    endsAt: new Date(row.ends_at),
    name: row.name,
    email: row.email,
    note: row.note,
    timeZone: row.time_zone,
    status: row.status,
    stripeSessionId: row.stripe_session_id,
    calendarEventId: row.calendar_event_id,
    meetUrl: row.meet_url,
  };
}

/** Postgres exclusion_violation: the range overlaps a live booking. */
function isOverlapError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === '23P01';
}

/** Held or confirmed time in [from, to). Expired holds don't count. */
export async function listBookedIntervals(from: Date, to: Date): Promise<Interval[]> {
  const rows = (await sql`
    SELECT starts_at, ends_at FROM call_bookings
    WHERE starts_at < ${to.toISOString()} AND ends_at > ${from.toISOString()}
      AND (status = 'confirmed' OR (status = 'held' AND hold_expires_at > now()))
  `) as Array<Pick<BookingRow, 'starts_at' | 'ends_at'>>;
  return rows.map((row) => ({ start: new Date(row.starts_at).getTime(), end: new Date(row.ends_at).getTime() }));
}

/**
 * Reserve a slot while the buyer pays. Returns false if someone else holds or
 * owns any part of it.
 */
export async function createHold(hold: {
  id: string;
  startsAt: Date;
  endsAt: Date;
  name: string;
  email: string;
  note: string | null;
  timeZone: string | null;
  holdExpiresAt: Date;
}): Promise<boolean> {
  const start = hold.startsAt.toISOString();
  const end = hold.endsAt.toISOString();

  // Expired holds still sit under the exclusion constraint until released.
  await sql`
    UPDATE call_bookings SET status = 'released'
    WHERE status = 'held' AND hold_expires_at <= now()
      AND tstzrange(starts_at, ends_at) && tstzrange(${start}::timestamptz, ${end}::timestamptz)
  `;

  try {
    await sql`
      INSERT INTO call_bookings (id, starts_at, ends_at, name, email, note, time_zone, status, hold_expires_at)
      VALUES (${hold.id}, ${start}, ${end}, ${hold.name}, ${hold.email}, ${hold.note}, ${hold.timeZone},
              'held', ${hold.holdExpiresAt.toISOString()})
    `;
    return true;
  } catch (error) {
    if (isOverlapError(error)) return false;
    throw error;
  }
}

export async function attachCheckoutSession(id: string, sessionId: string): Promise<void> {
  await sql`UPDATE call_bookings SET stripe_session_id = ${sessionId} WHERE id = ${id}`;
}

export async function getBooking(id: string): Promise<CallBooking | null> {
  const rows = (await sql`SELECT * FROM call_bookings WHERE id = ${id}`) as BookingRow[];
  return rows[0] ? toBooking(rows[0]) : null;
}

/** Free a held slot. Confirmed bookings are never released here. */
export async function releaseHold(id: string): Promise<void> {
  await sql`UPDATE call_bookings SET status = 'released' WHERE id = ${id} AND status = 'held'`;
}

export class SlotTakenError extends Error {
  constructor(readonly bookingId: string) {
    super(`Booking ${bookingId} was paid for, but its slot is now taken by another booking`);
  }
}

/**
 * Record payment. Idempotent: confirming an already-confirmed booking just
 * returns it. Throws SlotTakenError if the hold had lapsed and someone else
 * took the slot (the hold outlives Checkout, so this should not happen).
 */
export async function markConfirmed(
  id: string,
  payment: { amountCents: number | null; paymentIntentId: string | null },
): Promise<CallBooking | null> {
  try {
    const rows = (await sql`
      UPDATE call_bookings
      SET status = 'confirmed',
          confirmed_at = COALESCE(confirmed_at, now()),
          amount_cents = ${payment.amountCents},
          stripe_payment_intent_id = ${payment.paymentIntentId}
      WHERE id = ${id}
      RETURNING *
    `) as BookingRow[];
    return rows[0] ? toBooking(rows[0]) : null;
  } catch (error) {
    if (isOverlapError(error)) throw new SlotTakenError(id);
    throw error;
  }
}

export async function setCalendarEvent(id: string, eventId: string, meetUrl: string | null): Promise<void> {
  await sql`UPDATE call_bookings SET calendar_event_id = ${eventId}, meet_url = ${meetUrl} WHERE id = ${id}`;
}
