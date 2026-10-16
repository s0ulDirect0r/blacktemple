import type { Metadata } from 'next';
import Link from 'next/link';
import { resolveSupport } from '@/lib/support/payments';
import { supportMoney } from '@/lib/support/amount';

export const metadata: Metadata = { title: 'Thank you', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export const dynamic = 'force-dynamic';

export default async function SupportThanksPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  const outcome = await resolveSupport(session_id);
  const paid = outcome.kind === 'paid' || outcome.kind === 'paid-pending';
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 pb-24 pt-16 font-[family-name:var(--font-geist-sans)] sm:pt-24">
      <h1 className="font-pixel text-2xl leading-relaxed sm:text-4xl">{paid ? 'Thank you' : 'Checking your support'}</h1>
      <div className="mt-8 max-w-xl space-y-4 leading-relaxed text-zinc-400">
        {outcome.kind === 'paid' && <p>Your one-time support of <span className="text-white">{supportMoney(outcome.amountCents)} USD</span> was received. Thank you for helping me keep creating. — Anansi</p>}
        {outcome.kind === 'paid-pending' && <p>Your payment was received. The site is still recording it; you don&apos;t need to pay again. Thank you for your support.</p>}
        {outcome.kind === 'unconfirmed' && <p>We couldn&apos;t confirm a completed support payment from this link. If you just paid, wait a moment and refresh this page. Check Stripe&apos;s payment confirmation before starting another payment.</p>}
        {outcome.kind === 'unavailable' && <p>We can&apos;t check your payment right now. If you paid, please don&apos;t pay again. Refresh this page in a moment.</p>}
        {paid && <p>This was a single payment. There are no recurring charges, membership, services, or rewards.</p>}
        <p>For payment help, write to <a href="mailto:matthewhuff89@gmail.com" className="text-white underline underline-offset-4">matthewhuff89@gmail.com</a>.</p>
      </div>
      <Link href="/" className="mt-10 inline-block text-white underline underline-offset-4">Return to Black Temple</Link>
    </main>
  );
}
