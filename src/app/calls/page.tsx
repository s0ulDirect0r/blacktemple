import CallBooking from '@/components/calls/CallBooking';
import { formatPrice } from '@/lib/calls/config';
import { pageMetadata } from '@/lib/site';

const DESCRIPTION = 'A one-on-one conversation with Matthew D. Huff to get honest about what you want, explore it together, and find a next step toward it.';

export const metadata = pageMetadata({ title: 'Desire interviews', description: DESCRIPTION, path: '/calls' });

/** Standalone page (no 3D scene, see LayoutContent; the site bar sits above). */
export default function CallsPage() {
  const price = formatPrice();

  return (
    <div className="min-h-screen bg-black font-[family-name:var(--font-geist-sans)] text-zinc-100 antialiased">
      <div className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
        <main className="pt-16 sm:pt-24">
          <header>
            <h1 className="font-pixel text-2xl leading-none text-white sm:text-4xl lg:text-5xl">Desire interviews</h1>

            <div className="mt-6 max-w-xl space-y-4 text-base leading-relaxed text-zinc-400 sm:mt-8 sm:text-lg">
              <p>
                I love talking with people about their desires. A desire interview is a space to get honest
                about what you want, explore it together, and find a next step toward it.
              </p>
              <p>
                If it&apos;s hard to admit what you want—or it hasn&apos;t felt safe to own it—you&apos;re
                welcome here. You don&apos;t need a clear answer to begin.
              </p>
              <p>
                We&apos;ll talk about what you want, what it means to you, and what you feel in your body
                as you name it. I&apos;m interested in the places where you light up, hesitate, or surprise yourself.
              </p>
              <p>
                My hope is that you leave with a clearer sense of your desires right now, and one concrete
                step you want to take toward them.
              </p>
              <figure>
                <blockquote>
                  <p>“Thanks for helping me clarify my desires so I could ask for it.”</p>
                </blockquote>
                <figcaption className="mt-2 text-sm text-zinc-500">— A friend</figcaption>
              </figure>
            </div>

            <p className="mt-8 font-[family-name:var(--font-geist-mono)] text-sm text-zinc-300">
              60–90 minutes · {price} USD · One-on-one on Google Meet
            </p>
          </header>

          <div className="mt-12 border-t border-white/10 pt-10 sm:mt-16">
            <CallBooking priceLabel={price} />
          </div>
        </main>
      </div>
    </div>
  );
}
