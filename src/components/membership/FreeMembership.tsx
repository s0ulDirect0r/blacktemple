import Link from 'next/link';
import { ESCALATION_ORIGIN } from '@/lib/membership/config';
import styles from './membership.module.css';

/** The membership page while only free accounts are open. */
export default function FreeMembership({ signedIn }: { signedIn: boolean }) {
  return <div className={styles.world}><main className={styles.shell}>
    <header className={styles.hero}>
      <p className={styles.eyebrow}>Black Temple · Membership</p>
      <h1 className={styles.title}>Join<br />Black Temple.</h1>
      <p className={styles.lead}>A free membership for ESCALATION players and anyone who wants to follow the work.</p>
      <div className={styles.prose} style={{ marginTop: 22 }}>
        <p>Black Temple is where I make games, art, and stories. A membership gives you one account across it.</p>
        <ul className={styles.benefits}>
          <li>Sign in to <a className={styles.textLink} href={ESCALATION_ORIGIN}>ESCALATION</a> with your Black Temple account.</li>
          <li>Hear about new work by email, only if you choose to.</li>
          <li>Keep your place here as the Temple grows.</li>
        </ul>
        <p>It&apos;s free. There&apos;s nothing to buy and no activity requirement.</p>
      </div>
      <div className={styles.actions}>
        {signedIn
          ? <Link className={styles.button} href="/members">Go to your membership ↗</Link>
          : <><Link className={styles.button} href="/login?mode=signup">Create your free account ↗</Link><Link className={styles.secondary} href="/login">Sign in</Link></>}
      </div>
    </header>
    <footer className={styles.footer}><span className="font-pixel" style={{ fontSize: 9 }}>Black Temple</span><Link className={styles.textLink} href="/privacy">Privacy</Link></footer>
  </main></div>;
}
