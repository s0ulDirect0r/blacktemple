// Booking flow: validate → hold the slot → Stripe Checkout → confirm on payment
// (webhook or success page, whichever lands first) → calendar invite.

import { randomUUID } from 'node:crypto';
import type Stripe from 'stripe';

import { isSlotOpen } from './availability';
import {
  attachCheckoutSession,
  createHold,
  getBooking,
  markConfirmed,
  releaseHold,
  setCalendarEvent,
  type CallBooking,
} from './bookings';
import { CALL, CALL_DURATION_MS, MINUTE_MS } from './config';
import { createCallEvent } from './google';
import { stripe } from './stripe';

export interface CheckoutInput {
  start: Date;
  name: string;
  email: string;
  note: string | null;
  timeZone: string | null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function parseCheckoutInput(body: unknown): { ok: true; input: CheckoutInput } | { ok: false; error: string } {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'Invalid request.' };
  const { start, name, email, note, timeZone } = body as Record<string, unknown>;

  const startDate = typeof start === 'string' ? new Date(start) : null;
  if (!startDate || Number.isNaN(startDate.getTime())) return { ok: false, error: 'Pick a time.' };

  const cleanName = typeof name === 'string' ? name.trim() : '';
  if (cleanName.length === 0 || cleanName.length > 100) return { ok: false, error: 'Enter your name.' };

  const cleanEmail = typeof email === 'string' ? email.trim() : '';
  if (cleanEmail.length > 254 || !EMAIL_PATTERN.test(cleanEmail)) {
    return { ok: false, error: 'Enter a valid email address.' };
  }

  const cleanNote = typeof note === 'string' ? note.trim() : '';
  if (cleanNote.length > 2000) return { ok: false, error: 'Keep the note under 2,000 characters.' };

  const zone = typeof timeZone === 'string' && isValidTimeZone(timeZone) ? timeZone : null;

  return {
    ok: true,
    input: { start: startDate, name: cleanName, email: cleanEmail, note: cleanNote || null, timeZone: zone },
  };
}

export function describeSlot(start: Date, timeZone: string | null): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone ?? 'UTC',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(start);
}

export type StartCheckoutResult = { ok: true; url: string } | { ok: false; reason: 'taken' };

/** Hold the slot and open a Stripe Checkout session for it. */
export async function startCheckout(input: CheckoutInput, origin: string): Promise<StartCheckoutResult> {
  if (!(await isSlotOpen(input.start))) return { ok: false, reason: 'taken' };

  // Hex only, so it is also a valid Google Calendar event id.
  const id = randomUUID().replace(/-/g, '');
  const now = Date.now();
  const held = await createHold({
    id,
    startsAt: input.start,
    endsAt: new Date(input.start.getTime() + CALL_DURATION_MS),
    name: input.name,
    email: input.email,
    note: input.note,
    timeZone: input.timeZone,
    holdExpiresAt: new Date(now + CALL.holdMinutes * MINUTE_MS),
  });
  if (!held) return { ok: false, reason: 'taken' };

  const when = describeSlot(input.start, input.timeZone);
  try {
    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      // Cards (with Apple Pay and Google Pay) settle immediately; delayed
      // methods like bank debits would outlive the hold.
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CALL.currency,
            unit_amount: CALL.priceCents,
            product_data: { name: `${CALL.title} · ${CALL.durationMinutes} min`, description: when },
          },
        },
      ],
      customer_email: input.email,
      client_reference_id: id,
      metadata: { bookingId: id, start: input.start.toISOString() },
      // receipt_email makes Stripe send a receipt (in live mode) whatever the
      // Dashboard's customer email settings say.
      payment_intent_data: {
        description: `${CALL.title}, ${when}`,
        metadata: { bookingId: id },
        receipt_email: input.email,
      },
      expires_at: Math.floor(now / 1000) + CALL.checkoutMinutes * 60,
      success_url: `${origin}/calls/booked?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/calls?hold=${id}`,
    });
    await attachCheckoutSession(id, session.id);
    if (!session.url) throw new Error(`Stripe returned no URL for session ${session.id}`);
    return { ok: true, url: session.url };
  } catch (error) {
    await releaseHold(id);
    throw error;
  }
}

function bookingIdOf(session: Stripe.Checkout.Session): string | null {
  return session.client_reference_id ?? session.metadata?.bookingId ?? null;
}

const confirmDeps = { markConfirmed, createCallEvent, setCalendarEvent };

/**
 * Confirm a paid session: mark the booking paid and send the calendar invite.
 * Safe to call more than once for the same session. `deps` is for tests.
 */
export async function confirmCheckoutSession(
  session: Stripe.Checkout.Session,
  deps: typeof confirmDeps = confirmDeps,
): Promise<CallBooking | null> {
  const bookingId = bookingIdOf(session);
  if (!bookingId || session.payment_status !== 'paid') return null;

  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent?.id ?? null);
  const booking = await deps.markConfirmed(bookingId, { amountCents: session.amount_total, paymentIntentId });
  if (!booking || booking.calendarEventId) return booking;

  const event = await deps.createCallEvent(booking);
  await deps.setCalendarEvent(booking.id, event.eventId, event.meetUrl);
  return { ...booking, calendarEventId: event.eventId, meetUrl: event.meetUrl };
}

/** Checkout expired: give the slot back. */
export async function releaseExpiredSession(session: Stripe.Checkout.Session): Promise<void> {
  const bookingId = bookingIdOf(session);
  if (bookingId) await releaseHold(bookingId);
}

/**
 * The buyer backed out of Checkout. Close their session so it can't be paid
 * later, then free the slot. If they actually paid, confirm instead.
 */
export async function abandonCheckout(bookingId: string): Promise<void> {
  const booking = await getBooking(bookingId);
  if (!booking || booking.status !== 'held') return;

  if (booking.stripeSessionId) {
    const session = await stripe().checkout.sessions.retrieve(booking.stripeSessionId);
    if (session.status === 'complete') {
      await confirmCheckoutSession(session);
      return;
    }
    if (session.status === 'open') {
      try {
        await stripe().checkout.sessions.expire(session.id);
      } catch (error) {
        // Most likely paid in the meantime; the webhook will confirm it.
        console.warn(`[calls] could not expire session ${session.id}:`, error);
        return;
      }
    }
  }
  await releaseHold(bookingId);
}
