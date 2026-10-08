import CallBooking from '@/components/calls/CallBooking';
import { formatPrice } from '@/lib/calls/config';
import { pageMetadata } from '@/lib/site';
import styles from './page.module.css';

const DESCRIPTION = 'A one-on-one conversation with Matthew D. Huff to get honest about what you want, explore it together, and find a next step toward it.';

export const metadata = pageMetadata({ title: 'Desire Confessionals', description: DESCRIPTION, path: '/calls' });

// Match the portfolio's two painted star layers without adding a WebGL canvas.
function stars(seed: number, count: number) {
  let value = seed;
  const random = () => ((value = (Math.imul(value, 1664525) + 1013904223) >>> 0) / 4294967296);
  return Array.from({ length: count }, () => {
    const x = Math.round(random() * 100);
    const y = Math.round(random() * 100);
    const alpha = (0.2 + random() * 0.4).toFixed(2);
    return `radial-gradient(circle at ${x}% ${y}%, rgba(210,220,255,${alpha}) 0 1px, transparent 1.6px)`;
  }).join(',');
}
const distantStars = stars(31, 28);
const nearStars = stars(107, 14);

/** Standalone page (no 3D scene, see LayoutContent; the site bar sits above). */
export default function CallsPage() {
  const price = formatPrice();

  return (
    <div className={styles.page}>
      <div className={styles.starfield} aria-hidden="true">
        <div className={styles.distantStars} style={{ backgroundImage: distantStars }} />
        <div className={styles.nearStars} style={{ backgroundImage: nearStars }} />
      </div>
      <main className={styles.main}>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <h1 className={`font-pixel ${styles.eyebrow}`}>Desire Confessionals</h1>
            <h2 className={styles.invitation}>
              What do<br />you want?
            </h2>
            <p className={styles.introduction}>
              <span className={styles.lead}>I love talking with people about their desires.</span>{' '}
              A desire confessional is a space to <strong>get honest about what you want</strong>, explore
              it together, and <strong>find a next step toward it.</strong>
            </p>
            <div className={styles.heroActions}>
              <a href="#book" className={styles.cta}>
                Choose a time <span aria-hidden="true">↗</span>
              </a>
              <p className={styles.host}>with Matthew D. Huff</p>
            </div>
          </div>

          <p className={styles.terms}>
            <span>60–90 minutes</span>
            <span>{price} USD</span>
            <span>One-on-one on Google Meet</span>
          </p>
        </header>

        <div className={styles.conversation}>
          <section className={styles.about} aria-labelledby="conversation-heading">
            <p className={`font-pixel ${styles.sectionLabel}`}>The conversation</p>
            <h2 id="conversation-heading" className={styles.conversationTitle}>
              You don&apos;t need<br />a clear answer to begin.
            </h2>
            <div className={styles.prose}>
              <p>
                If it&apos;s hard to admit what you want—or it hasn&apos;t felt safe to own it—<strong>you&apos;re welcome here.</strong>
              </p>
              <p>
                We&apos;ll talk about what you want, what it means to you, and what you feel in your body
                as you name it. I&apos;m interested in the places where you light up, hesitate, or surprise yourself.
              </p>
              <p>
                My hope is that you leave with a clearer sense of your desires right now, and one concrete
                step you want to take toward them.
              </p>
            </div>

            <figure className={styles.testimonial}>
              <blockquote>
                <p>“Thanks for helping me clarify my desires so I could ask for it.”</p>
              </blockquote>
              <figcaption>— A friend</figcaption>
            </figure>
          </section>

          <div id="book" className={styles.booking}>
            <CallBooking priceLabel={price} />
          </div>
        </div>

        <footer className={styles.footer}>
          <span className="font-pixel">Black Temple</span>
          <span>A conversation with Matthew D. Huff.</span>
        </footer>
      </main>
    </div>
  );
}
