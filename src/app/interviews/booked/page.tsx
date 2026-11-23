import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { stripe } from '@/lib/calls/stripe';
import { isPaidInterviewsSession } from '@/lib/interviews/checkout';

export const metadata: Metadata = { title: 'Booked', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export const dynamic = 'force-dynamic';

const CONTACT_EMAIL = 'matthewhuff89@gmail.com';

/** Stripe sends buyers here after paying for Customer Desire Interviews. */
async function isPaid(sessionId: string): Promise<{ paid: boolean; email: string | null }> {
  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId);
    return { paid: isPaidInterviewsSession(session), email: session.customer_details?.email ?? null };
  } catch {
    return { paid: false, email: null };
  }
}

export default async function InterviewsBookedPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: sessionId } = await searchParams;
  if (!sessionId) redirect('/interviews');

  const { paid, email } = await isPaid(sessionId);
  const contact = (
    <a href={`mailto:${CONTACT_EMAIL}`} className="text-white underline underline-offset-4">
      {CONTACT_EMAIL}
    </a>
  );

  return (
    <div className="min-h-screen bg-black font-[family-name:var(--font-geist-sans)] text-zinc-100 antialiased">
      <div className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
        <main className="pt-16 sm:pt-24">
          {paid ? (
            <>
              <h1 className="font-pixel text-2xl leading-none text-white sm:text-4xl">You&apos;re booked</h1>
              <div className="mt-8 max-w-xl space-y-4 leading-relaxed text-zinc-400">
                <p>
                  Thank you. I&apos;ll email you{email ? <> at <span className="text-zinc-200">{email}</span></> : null} to set
                  up our first call. Stripe will email your receipt.
                </p>
                <p>Questions before then? Write to {contact}.</p>
              </div>
            </>
          ) : (
            <>
              <h1 className="font-pixel text-2xl leading-none text-white sm:text-4xl">Not booked yet</h1>
              <p className="mt-8 max-w-xl leading-relaxed text-zinc-400">
                We couldn&apos;t find a completed payment.{' '}
                <Link href="/interviews" className="text-white underline underline-offset-4">
                  Go back
                </Link>{' '}
                to try again, or write to {contact}.
              </p>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
