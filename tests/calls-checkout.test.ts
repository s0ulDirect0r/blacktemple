import './helpers/placeholder-db-env';
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import type Stripe from 'stripe';

import { confirmCheckoutSession, parseCheckoutInput } from '@/lib/calls/checkout';
import type { CallBooking } from '@/lib/calls/bookings';

const booking: CallBooking = {
  id: '0123456789abcdef0123456789abcdef',
  startsAt: new Date('2026-10-06T19:00:00Z'),
  endsAt: new Date('2026-10-06T20:00:00Z'),
  name: 'Ada',
  email: 'ada@example.com',
  note: null,
  timeZone: 'America/Chicago',
  status: 'confirmed',
  stripeSessionId: 'cs_test_1',
  calendarEventId: null,
  meetUrl: null,
};

function session(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  return {
    id: 'cs_test_1',
    client_reference_id: booking.id,
    metadata: { bookingId: booking.id },
    payment_status: 'paid',
    payment_intent: 'pi_test_1',
    amount_total: 10_000,
    ...overrides,
  } as Stripe.Checkout.Session;
}

test('parseCheckoutInput accepts a valid request and trims fields', () => {
  const result = parseCheckoutInput({
    start: '2026-10-06T19:00:00.000Z',
    name: '  Ada  ',
    email: ' ada@example.com ',
    note: '   ',
    timeZone: 'America/Chicago',
  });
  assert.deepEqual(result, {
    ok: true,
    input: {
      start: new Date('2026-10-06T19:00:00.000Z'),
      name: 'Ada',
      email: 'ada@example.com',
      note: null,
      timeZone: 'America/Chicago',
    },
  });
});

test('parseCheckoutInput rejects bad input and drops unknown time zones', () => {
  assert.equal(parseCheckoutInput({ start: 'nope', name: 'Ada', email: 'ada@example.com' }).ok, false);
  assert.equal(parseCheckoutInput({ start: '2026-10-06T19:00:00Z', name: '', email: 'ada@example.com' }).ok, false);
  assert.equal(parseCheckoutInput({ start: '2026-10-06T19:00:00Z', name: 'Ada', email: 'ada' }).ok, false);

  const result = parseCheckoutInput({
    start: '2026-10-06T19:00:00Z',
    name: 'Ada',
    email: 'ada@example.com',
    timeZone: 'Mars/Olympus_Mons',
  });
  assert.ok(result.ok);
  assert.equal(result.input.timeZone, null);
});

function fakeDeps(booked: CallBooking) {
  return {
    markConfirmed: mock.fn(async () => booked),
    createCallEvent: mock.fn(async () => ({ eventId: booking.id, meetUrl: 'https://meet.google.com/abc-defg-hij' })),
    setCalendarEvent: mock.fn(async () => undefined),
  };
}

test('confirmCheckoutSession ignores unpaid sessions', async () => {
  const deps = fakeDeps(booking);
  assert.equal(await confirmCheckoutSession(session({ payment_status: 'unpaid' }), deps), null);
  assert.equal(deps.markConfirmed.mock.callCount(), 0);
});

test('confirmCheckoutSession marks the booking paid and sends one invite', async () => {
  const deps = fakeDeps(booking);
  const result = await confirmCheckoutSession(session(), deps);

  assert.deepEqual(deps.markConfirmed.mock.calls[0].arguments, [
    booking.id,
    { amountCents: 10_000, paymentIntentId: 'pi_test_1' },
  ]);
  assert.equal(deps.createCallEvent.mock.callCount(), 1);
  assert.deepEqual(deps.setCalendarEvent.mock.calls[0].arguments, [
    booking.id,
    booking.id,
    'https://meet.google.com/abc-defg-hij',
  ]);
  assert.equal(result?.meetUrl, 'https://meet.google.com/abc-defg-hij');
});

test('confirmCheckoutSession does not invite twice', async () => {
  const deps = fakeDeps({ ...booking, calendarEventId: booking.id });
  const result = await confirmCheckoutSession(session(), deps);

  assert.equal(result?.calendarEventId, booking.id);
  assert.equal(deps.createCallEvent.mock.callCount(), 0);
});
