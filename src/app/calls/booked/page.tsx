import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { SlotTakenError, type CallBooking } from '@/lib/calls/bookings';
import { confirmCheckoutSession, describeSlot } from '@/lib/calls/checkout';
import { stripe } from '@/lib/calls/stripe';

export const metadata: Metadata = { title: 'Booked', robots: { index: false } };

const CONTACT_EMAIL = 'matthewhuff89@gmail.com';

type Outcome =
  | { kind: 'booked'; booking: CallBooking; inviteSent: boolean }
  | { kind: 'paid-pending' }
  | { kind: 'slot-taken' }
  | { kind: 'unpaid' };

/**
 * Stripe sends buyers here after paying. The page confirms the booking itself
 * (idempotently, alongside the webhook) so the invite goes out even if the
 * webhook is slow or missing.
 */
async function resolve(sessionId: string): Promise<Outcome> {
  let session;
  try {
    session = await stripe().checkout.sessions.retrieve(sessionId);
  } catch {
    return { kind: 'unpaid' };
  }
  if (session.payment_status !== 'paid') return { kind: 'unpaid' };

  try {
    const booking = await confirmCheckoutSession(session);
    return booking ? { kind: 'booked', booking, inviteSent: Boolean(booking.calendarEventId) } : { kind: 'paid-pending' };
  } catch (error) {
    if (error instanceof SlotTakenError) {
      console.error('[calls] paid booking lost its slot:', error);
      return { kind: 'slot-taken' };
    }
    // Payment went through; the webhook retries the invite.
    console.error('[calls] confirmation on success page failed:', error);
    return { kind: 'paid-pending' };
  }
}

export default async function BookedPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: sessionId } = await searchParams;
  if (!sessionId) redirect('/calls');

  const outcome = await resolve(sessionId);

  return (
    <div className="min-h-screen bg-black font-[family-name:var(--font-geist-sans)] text-zinc-100 antialiased">
      <div className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
        <main className="pt-16 sm:pt-24">
          {outcome.kind === 'booked' && (
            <>
              <h1 className="font-pixel text-2xl leading-none text-white sm:text-4xl">You&apos;re booked</h1>
              <p className="mt-8 text-lg text-white sm:text-xl">
                {describeSlot(outcome.booking.startsAt, outcome.booking.timeZone)}
              </p>
              <div className="mt-6 max-w-xl space-y-4 leading-relaxed text-zinc-400">
                <p>
                  A calendar invite with the video link is on its way to{' '}
                  <span className="text-zinc-200">{outcome.booking.email}</span>. Stripe will email your receipt.
                </p>
                {outcome.booking.meetUrl && (
                  <p>
                    Video link:{' '}
                    <a href={outcome.booking.meetUrl} className="text-white underline underline-offset-4">
                      {outcome.booking.meetUrl.replace(/^https:\/\//, '')}
                    </a>
                  </p>
                )}
                <p>
                  Need to reschedule? Reply to the invite or write to{' '}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="text-white underline underline-offset-4">
                    {CONTACT_EMAIL}
                  </a>
                  .
                </p>
              </div>
            </>
          )}

          {outcome.kind === 'paid-pending' && (
            <>
              <h1 className="font-pixel text-2xl leading-none text-white sm:text-4xl">Payment received</h1>
              <p className="mt-8 max-w-xl leading-relaxed text-zinc-400">
                Thank you. Your calendar invite is on its way and should arrive within a few minutes. If it
                doesn&apos;t, write to{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-white underline underline-offset-4">
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </>
          )}

          {outcome.kind === 'slot-taken' && (
            <>
              <h1 className="font-pixel text-2xl leading-none text-white sm:text-4xl">Payment received</h1>
              <p className="mt-8 max-w-xl leading-relaxed text-zinc-400">
                Your payment went through, but that time was taken while you were paying. I&apos;ll email you to
                find another time, or refund you in full. You can also reach me at{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-white underline underline-offset-4">
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </>
          )}

          {outcome.kind === 'unpaid' && (
            <>
              <h1 className="font-pixel text-2xl leading-none text-white sm:text-4xl">Not booked yet</h1>
              <p className="mt-8 max-w-xl leading-relaxed text-zinc-400">
                We couldn&apos;t find a completed payment for this booking.{' '}
                <Link href="/calls" className="text-white underline underline-offset-4">
                  Pick a time
                </Link>{' '}
                to try again.
              </p>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
