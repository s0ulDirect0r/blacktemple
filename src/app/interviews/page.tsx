import { INTERVIEWS } from '@/lib/interviews/config';
import { pageMetadata } from '@/lib/site';
import calls from '../calls/page.module.css';
import styles from './page.module.css';

const DESCRIPTION =
  'Matthew D. Huff talks one-on-one with five of your customers, or the ones who left, and brings back what they actually want, in their own words, with a pitch rebuilt around it.';

export const metadata = pageMetadata({ title: INTERVIEWS.title, description: DESCRIPTION, path: '/interviews' });

// Same two painted star layers as /calls.
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
const distantStars = stars(53, 28);
const nearStars = stars(211, 14);

function BookButton({ className = '' }: { className?: string }) {
  if (!INTERVIEWS.paymentLink) {
    return (
      <span className={`${calls.cta} ${styles.unavailable} ${className}`} aria-disabled="true">
        Booking opens soon
      </span>
    );
  }
  return (
    <a href={INTERVIEWS.paymentLink} className={`${calls.cta} ${className}`}>
      Book your interviews <span aria-hidden="true">↗</span>
    </a>
  );
}

/** Standalone page (no 3D scene, see LayoutContent; the site bar sits above). */
export default function InterviewsPage() {
  return (
    <div className={calls.page}>
      <div className={calls.starfield} aria-hidden="true">
        <div className={calls.distantStars} style={{ backgroundImage: distantStars }} />
        <div className={calls.nearStars} style={{ backgroundImage: nearStars }} />
      </div>
      <main className={calls.main}>
        <header className={calls.hero}>
          <div className={calls.heroCopy}>
            <h1 className={`font-pixel ${calls.eyebrow}`}>{INTERVIEWS.title}</h1>
            <h2 className={calls.invitation}>
              What do your<br />customers want?
            </h2>
            <p className={calls.introduction}>
              <span className={calls.lead}>Most businesses guess why people buy. I ask.</span>{' '}
              I sit down one-on-one with five of your customers, or the ones who left, and get honest with them
              about <strong>what they wanted, where they hesitated, and what made them light up.</strong> You get it
              back in their own words, with a pitch rebuilt around it.
            </p>
            <div className={calls.heroActions}>
              <a href="#book" className={calls.cta}>
                See what you get <span aria-hidden="true">↓</span>
              </a>
              <p className={calls.host}>with Matthew D. Huff</p>
            </div>
          </div>

          <p className={calls.terms}>
            <span>{INTERVIEWS.interviewCount} interviews</span>
            <span>{INTERVIEWS.priceLabel} USD</span>
            <span>One-on-one on Google Meet</span>
          </p>
        </header>

        <div className={calls.conversation}>
          <div className={calls.about}>
            <section aria-labelledby="fit-heading" className={styles.section}>
              <p className={`font-pixel ${calls.sectionLabel}`}>Who it&apos;s for</p>
              <h2 id="fit-heading" className={calls.conversationTitle}>
                You sell something<br />people choose.
              </h2>
              <div className={calls.prose}>
                <p>A product, a service, a membership, a course. It fits when one of these sounds familiar:</p>
                <ul className={styles.signs}>
                  <li>You have customers, but you can&apos;t quite say why they bought.</li>
                  <li>People visit, look around and leave, and you don&apos;t know what stopped them.</li>
                  <li>Your pitch sounds like everyone else&apos;s.</li>
                  <li>You&apos;re about to relaunch, change your price or write a new landing page.</li>
                </ul>
              </div>
            </section>

            <section aria-labelledby="process-heading">
              <p className={`font-pixel ${calls.sectionLabel}`}>What happens</p>
              <h2 id="process-heading" className={calls.conversationTitle}>
                Five honest<br />conversations.
              </h2>
              <ol className={`${calls.prose} ${styles.steps}`}>
                <li>
                  <strong>We start with you.</strong> A short call about what you sell, who you want more of and what
                  you most want to know. You pick five people: current customers, recent buyers or people who left.
                </li>
                <li>
                  <strong>I talk with them.</strong> Five one-on-one conversations, 60–90 minutes each. I ask what they
                  wanted, what it meant to them and what they felt as they decided. I&apos;m interested in the moments
                  they light up, hesitate or surprise themselves. That&apos;s the part nobody writes in a survey.
                </li>
                <li>
                  <strong>I bring it back.</strong> I write up what I found and walk you through it on a call.
                </li>
              </ol>
            </section>
          </div>

          <div id="book" className={calls.booking}>
            <h2 className={styles.panelTitle}>What you get</h2>
            <ul className={`${calls.prose} ${styles.deliverables}`}>
              <li>
                <strong>A one-page readout:</strong> what your customers actually want, in their own words, with the
                quotes that matter.
              </li>
              <li>
                <strong>The hesitations:</strong> where people almost didn&apos;t buy, and what stopped them.
              </li>
              <li>
                <strong>A rewritten pitch:</strong> your headline, one-line description and core message, rebuilt on
                what they told me.
              </li>
              <li>
                <strong>The notes:</strong> my notes from all five conversations.
              </li>
            </ul>
            <p className={styles.price}>{INTERVIEWS.priceLabel}</p>
            <p>All five interviews, the readout and the rewritten pitch, paid up front.</p>
            <BookButton className={styles.panelCta} />
            <p className={styles.panelNote}>After you pay, I&apos;ll reach out to set up our first call.</p>
          </div>
        </div>

        <section aria-labelledby="about-heading" className={styles.section}>
          <p className={`font-pixel ${calls.sectionLabel}`}>About Matthew</p>
          <h2 id="about-heading" className={calls.conversationTitle}>
            I listen, and<br />I build.
          </h2>
          <div className={calls.prose}>
            <p>
              I&apos;m Matthew D. Huff. I run <a href="/calls">Desire Confessionals</a>, one-on-one conversations where
              people get honest about what they want. I&apos;ve also spent years as a software engineer, built games,
              and published a novel, <em>An Infinite Heart</em>.
            </p>
            <div className={styles.build}>
              <p>
                <strong>Want it built too?</strong> Once we know what your customers want, I can make the thing that
                answers it: a new landing page, an interactive demo that makes your product click, or a small AI tool
                that removes the hesitation.
              </p>
              <p>We&apos;d price that separately, after the readout.</p>
            </div>
          </div>
        </section>

        <footer className={calls.footer}>
          <span className="font-pixel">Black Temple</span>
          <span>Customer Desire Interviews with Matthew D. Huff.</span>
        </footer>
      </main>
    </div>
  );
}
