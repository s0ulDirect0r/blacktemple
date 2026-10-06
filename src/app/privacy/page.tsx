import Link from 'next/link';
import { pageMetadata } from '@/lib/site';

export const metadata = pageMetadata({
  title: 'Privacy',
  description: 'How blacktemple.dev handles your information.',
  path: '/privacy',
});

const CONTACT_EMAIL = 'matthewhuff89@gmail.com';

const link = 'text-white underline underline-offset-4';

/** Standalone page (no 3D scene, see LayoutContent; the site bar sits above). */
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black font-[family-name:var(--font-geist-sans)] text-zinc-100 antialiased">
      <div className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
        <main className="pt-16 sm:pt-24">
          <h1 className="font-pixel text-2xl leading-none text-white sm:text-4xl">Privacy</h1>
          <p className="mt-4 text-sm text-zinc-500">Last updated October 6, 2026</p>

          <div className="mt-10 max-w-xl space-y-10 leading-relaxed text-zinc-400">
            <section className="space-y-4">
              <p>
                This site doesn&apos;t use analytics, ads or tracking cookies. It&apos;s hosted on Vercel, which, like any
                web host, keeps short-lived server logs (including IP addresses) to run and protect the service.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="font-pixel text-base text-white">Booking a call</h2>
              <p>
                When you book a call on <Link href="/calls" className={link}>/calls</Link>, I collect your name, your
                email, the time you pick, your time zone, and anything you write in the optional note. I use them only
                to schedule and hold the call:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>They&apos;re stored in this site&apos;s database.</li>
                <li>
                  Your name and email go on a Google Calendar invite, which Google emails to you with a Google Meet
                  link.
                </li>
                <li>
                  Payment is handled by Stripe. Your card details go straight to Stripe and never reach this site.
                  Stripe emails your receipt.
                </li>
              </ul>
              <p>I don&apos;t sell or share your information with anyone else, and I won&apos;t add you to a mailing list.</p>
            </section>

            <section className="space-y-4">
              <h2 className="font-pixel text-base text-white">How long it&apos;s kept</h2>
              <p>
                I keep booking records for bookkeeping and taxes. Stripe and Google keep their own records under their
                policies:{' '}
                <a href="https://stripe.com/privacy" className={link}>
                  Stripe
                </a>
                ,{' '}
                <a href="https://policies.google.com/privacy" className={link}>
                  Google
                </a>
                .
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="font-pixel text-base text-white">Your choices</h2>
              <p>
                Write to{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className={link}>
                  {CONTACT_EMAIL}
                </a>{' '}
                to see, correct or delete what I have about you. Payment records that Stripe is required to keep by law
                aren&apos;t mine to delete.
              </p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
