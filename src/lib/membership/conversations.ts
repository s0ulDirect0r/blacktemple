import { randomUUID } from 'node:crypto';
import { CALL, CALL_DURATION_MS, DAY_MS, HOUR_MS } from '@/lib/calls/config';
import { listBookedIntervals } from '@/lib/calls/bookings';
import { createCallEvent, listBusy, listOpenWindows } from '@/lib/calls/google';
import { computeSlots, type Interval } from '@/lib/calls/slots';
import { hasAccess } from './config';
import { lock, membershipDatabase, transaction } from './database';
import { MemberError } from './errors';
import { currentMembership, type Invoice } from './store';

export const CONVERSATION_FOCUS = { desire: 'Desire Confessional', creative: 'Creative championing' } as const;
export type ConversationFocus = keyof typeof CONVERSATION_FOCUS;
export interface ConversationBooking {
  id: string; starts_at: Date; ends_at: Date; focus: ConversationFocus; status: 'booking' | 'confirmed' | 'failed';
  meet_url: string | null; period_start: Date;
}
const bookingLock = 'member-conversation-bookings';

/** Validate a booking request body: a slot start, a focus and an optional note. */
export function parseConversationRequest(body: Record<string, unknown>): { start: Date; focus: ConversationFocus; note: string | null } {
  const start = typeof body.start === 'string' ? new Date(body.start) : null;
  if (!start || Number.isNaN(start.getTime())) throw new MemberError(400, 'Choose a time for the conversation.');
  if (typeof body.focus !== 'string' || !Object.hasOwn(CONVERSATION_FOCUS, body.focus)) throw new MemberError(400, 'Choose what the conversation is for.');
  if (body.note !== undefined && body.note !== null && typeof body.note !== 'string') throw new MemberError(400, 'Include the note as text.');
  const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null;
  if (note && note.length > 2000) throw new MemberError(400, 'Keep the note under 2,000 characters.');
  return { start, focus: body.focus as ConversationFocus, note };
}

async function memberBookedIntervals(from: Date, to: Date): Promise<Interval[]> {
  const rows = (await membershipDatabase().query<{ starts_at: Date; ends_at: Date }>(
    "SELECT starts_at,ends_at FROM member_conversation_bookings WHERE status<>'failed' AND starts_at<$2 AND ends_at>$1", [from,to])).rows;
  return rows.map(row => ({ start: row.starts_at.getTime(), end: row.ends_at.getTime() }));
}

/** Open times from the shared /calls availability, minus calendar busy time, /calls holds and member bookings. */
export async function conversationSlots(now: Date = new Date()): Promise<Date[]> {
  const to = new Date(now.getTime() + CALL.horizonDays * DAY_MS);
  const [windows, busy, callHolds, members] = await Promise.all([
    listOpenWindows(now, to),
    listBusy(now, to),
    // Unpaid /calls holds live in the site database, which a membership sandbox may not have.
    process.env.DATABASE_URL ? listBookedIntervals(now, to) : Promise.resolve([]),
    memberBookedIntervals(now, to),
  ]);
  return computeSlots({ windows, busy: [...busy, ...callHolds, ...members], durationMs: CALL_DURATION_MS, earliest: now.getTime() + CALL.minNoticeHours * HOUR_MS, latest: to.getTime() }).map(ms => new Date(ms));
}

export async function conversationBookings(userId: string) {
  return (await membershipDatabase().query<ConversationBooking>(
    "SELECT id,starts_at,ends_at,focus,status,meet_url,period_start FROM member_conversation_bookings WHERE user_id=$1 AND status<>'failed' ORDER BY starts_at DESC LIMIT 12", [userId])).rows;
}

/** Book one conversation for the paid month that contains now, straight onto the calendar. */
export async function bookConversation(user: { id: string; name: string; email: string }, request: { start: Date; focus: ConversationFocus; note: string | null }) {
  const id = randomUUID().replace(/-/g, ''); // Google event ids allow only base32hex characters.
  const endsAt = new Date(request.start.getTime() + CALL_DURATION_MS);
  await transaction(async client => {
    await lock(client, bookingLock);
    const membership = await currentMembership(user.id, client);
    if (!hasAccess(membership, 'conversations')) throw new MemberError(403, 'Private conversations are included with an active Champion membership.');
    const invoice = (await client.query<Invoice>("SELECT * FROM membership_invoices WHERE membership_id=$1 AND status='paid' AND period_start<=NOW() AND period_end>NOW() ORDER BY period_start DESC LIMIT 1", [membership!.id])).rows[0];
    if (!invoice) throw new MemberError(403, 'A paid membership month is needed to book a conversation.');
    if ((await client.query("SELECT 1 FROM member_conversation_bookings WHERE membership_id=$1 AND period_start=$2 AND status<>'failed'", [membership!.id, invoice.period_start])).rowCount) throw new MemberError(409, 'You already have a conversation booked for this membership month.');
    if (!(await conversationSlots()).some(slot => slot.getTime() === request.start.getTime())) throw new MemberError(409, 'That time is no longer open. Please choose another.');
    await client.query('INSERT INTO member_conversation_bookings(id,user_id,membership_id,period_start,starts_at,ends_at,focus,note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [id, user.id, membership!.id, invoice.period_start, request.start, endsAt, request.focus, request.note]);
  });
  try {
    const event = await createCallEvent({ id, startsAt: request.start, endsAt, name: user.name || user.email, email: user.email, note: request.note,
      context: `Champion private conversation (Black Temple membership): ${CONVERSATION_FOCUS[request.focus]}.` });
    await membershipDatabase().query("UPDATE member_conversation_bookings SET status='confirmed',calendar_event_id=$2,meet_url=$3 WHERE id=$1", [id, event.eventId, event.meetUrl]);
    return { id, startsAt: request.start, meetUrl: event.meetUrl };
  } catch {
    // Release the slot and the month; the member can simply try again.
    await membershipDatabase().query("UPDATE member_conversation_bookings SET status='failed' WHERE id=$1 AND status='booking'", [id]);
    throw new MemberError(503, 'The calendar could not be reached, so nothing was booked. Please try again in a moment.');
  }
}
