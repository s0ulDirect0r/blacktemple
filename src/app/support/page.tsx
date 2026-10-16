import Link from 'next/link';
import SupportForm from '@/components/support/SupportForm';
import { pageMetadata } from '@/lib/site';

export const metadata = pageMetadata({ title: 'Support', description: 'Optional one-time support for Anansi’s work at Black Temple.', path: '/support' });
export const dynamic = 'force-dynamic';

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const { checkout } = await searchParams;
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 pb-24 pt-16 font-[family-name:var(--font-geist-sans)] sm:pt-24">
      <Link href="/" className="text-sm text-zinc-400 underline underline-offset-4 hover:text-white">Black Temple</Link>
      <p className="font-pixel mt-12 text-xs text-zinc-400">A little fuel for the work</p>
      <h1 className="font-pixel mt-6 text-2xl leading-relaxed text-white sm:text-4xl">Support the Temple</h1>
      <div className="mt-8 max-w-xl space-y-4 leading-relaxed text-zinc-400">
        <p>If something here has moved you, you&apos;re welcome to send a little support. It helps me keep making art, writing, and strange things on the internet.</p>
        <p>This is an optional, one-time payment to support my work. It doesn&apos;t include membership, services, or rewards.</p>
        <p className="text-zinc-200">Thank you for being here. — Anansi</p>
      </div>
      {checkout === 'cancelled' && <p role="status" className="mt-8 text-sm text-zinc-400">You left checkout. No support payment is confirmed here. You can return whenever you like.</p>}
      <SupportForm enabled={process.env.SUPPORT_CHECKOUT_ENABLED === 'true'} />
      <p className="mt-8 text-sm text-zinc-400"><Link href="/privacy" className="underline underline-offset-4 hover:text-white">Privacy</Link></p>
    </main>
  );
}
