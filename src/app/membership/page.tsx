import Link from 'next/link';
import { pageMetadata } from '@/lib/site';
import { memberSession } from '@/lib/membership/auth';
import { TIERS, money } from '@/lib/membership/config';
import styles from '@/components/membership/membership.module.css';

export const metadata = pageMetadata({ title: 'Membership', description: 'Enter the studio. Three-month memberships supporting the games, art, writing, and creative companionship of Black Temple.', path: '/membership' });
export default async function MembershipPage() {
  const session = await memberSession();
  return <div className={styles.world}><main className={styles.shell}>
    <header className={styles.hero}>
      <p className={styles.eyebrow}>Black Temple · Membership</p>
      <h1 className={styles.title}>A world<br />to enter.</h1>
      <p className={styles.lead}>Come closer to what I&apos;m making. Make room for what&apos;s alive in you.</p>
      <div className={styles.prose} style={{ marginTop: 22 }}><p>Black Temple is where I make games, art, and stories. Membership brings you inside the studio—and, if you want, into creative company and conversation.</p><p>Your support helps this world grow. <strong>Your own curiosity has a place here, too.</strong></p></div>
      {process.env.MEMBERSHIP_BILLING_MODE !== 'live' && <p className={styles.badge}>Local offering draft · sandbox payments</p>}
    </header>
    <p className={styles.prose}>Choose a three-month term. Three monthly payments, then it ends. <strong>No automatic renewal or fourth charge.</strong></p>
    <div className={styles.cards}>{TIERS.map(tier => <article className={styles.card} key={tier.id}>
      <h2>{tier.name}</h2><p className={styles.price}>{money(tier.monthlyCents)}<small> / month</small></p>
      <p className={styles.note}>3 payments · {money(tier.monthlyCents * 3)} USD total</p>
      <p className={styles.invitation}>{tier.invitation}</p><p className={styles.description}>{tier.description}</p>
      <ul className={styles.benefits}>{tier.benefits.map(benefit => <li key={benefit}>{benefit}</li>)}</ul>
      <Link className={styles.button} href={'/membership/checkout?tier=' + tier.id}>Choose {tier.name} <span aria-hidden="true">↗</span></Link>
    </article>)}</div>
    <section className={styles.prose}><h2 className={styles.sectionTitle} style={{ color: '#f4f4f5', marginBottom: 20 }}>What you&apos;re entering</h2>
      <p>The archive and studio dispatches are for members. Gatherings are a space to bring a work in progress, share what you&apos;re exploring, or simply be in the room. Private conversations can follow your desires or the creative thing you want to give more life to.</p>
      <p>You don&apos;t need a polished project or a clear answer. Bring presence, curiosity, compassion, and wonder.</p>
      <p className={styles.note}>This first invitation is still being shaped. The offerings, cancellation and refund terms, and arrangements for missed sessions need review before a live opening. Gatherings and private conversations will be arranged together; no dates are announced yet.</p>
      <div className={styles.actions}><Link className={styles.secondary} href={session ? '/members' : '/login'}>{session ? 'Enter your members area ↗' : 'Already have an account? Sign in ↗'}</Link></div>
    </section>
    <footer className={styles.footer}><span className="font-pixel" style={{ fontSize: 9 }}>Black Temple</span><Link className={styles.textLink} href="/privacy">Privacy</Link></footer>
  </main></div>;
}
