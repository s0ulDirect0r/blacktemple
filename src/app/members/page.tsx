import Link from 'next/link';
import { requireMemberSession } from '@/lib/membership/auth';
import { currentMembership } from '@/lib/membership/store';
import { ESCALATION_ORIGIN, hasAccess, paidMembershipVisible } from '@/lib/membership/config';
import { emailUpdatesFor } from '@/lib/membership/preferences';
import { supportFor } from '@/lib/escalation/store';
import EmailUpdates from '@/components/membership/EmailUpdates';
import { studioForMember } from '@/lib/membership/content';
import styles from '@/components/membership/membership.module.css';

export const metadata = { title: 'Studio' };

export default async function StudioPage() {
  const session = await requireMemberSession('/members');
  const membership = await currentMembership(session.user.id);
  if (!hasAccess(membership) && !paidMembershipVisible()) {
    const [emailUpdates, support] = await Promise.all([emailUpdatesFor(session.user.id), supportFor(session.user.id)]);
    return <>
      <section className={styles.panel}><p className={styles.eyebrow}>Black Temple · Free membership</p><h2 className={styles.lead}>You have a place here.</h2><p className={styles.prose}>Your membership is one account across Black Temple. New spaces will open here as the Temple grows.</p></section>
      <section style={{ marginTop: 32 }}><h2 className={styles.sectionTitle}>ESCALATION</h2><p className={styles.prose} style={{ marginTop: 16 }}>Sign in from the game with this account. {support.supporter ? 'Thank you for supporting early access.' : support.earlyAccess ? 'You have early access.' : ''}</p><div className={styles.actions}><a className={styles.button} href={ESCALATION_ORIGIN}>Play ESCALATION ↗</a></div></section>
      <section style={{ marginTop: 40 }}><h2 className={styles.sectionTitle}>Email</h2><p className={styles.note} style={{ margin: '12px 0' }}>Only if you want it. Account emails, like password resets, always arrive.</p><EmailUpdates initial={emailUpdates} /></section>
    </>;
  }
  if (!hasAccess(membership)) return <><h2 className={styles.sectionTitle}>The studio</h2><div className={styles.empty}><h2>A place is waiting for you.</h2><p className={styles.prose}>Your account is ready. A paid membership opens the studio archive and monthly dispatches.</p><div className={styles.actions}><Link className={styles.button} href="/membership">Choose your membership ↗</Link><Link className={styles.secondary} href="/members/membership">Check My Membership</Link></div></div></>;
  const entries = await studioForMember(session.user.id);
  return <><section className={styles.panel}><p className={styles.eyebrow}>A temple of creative experimentation.</p><h2 className={styles.lead}>Your work has a place here.</h2><p className={styles.prose}>Bring a fragment into the shared room, choose who you want to become, or quietly follow what is taking shape.</p><div className={styles.actions}><Link className={styles.button} href="/members/feed">Feed the Unknown Machine ↗</Link><Link className={styles.secondary} href="/members/identity">Identity &amp; export</Link></div></section><p className={styles.eyebrow} style={{marginTop:32}}>Members studio · Publisher archive</p><h2 className={styles.lead} style={{ marginTop: 16 }}>Work as it comes into being.</h2><p className={styles.prose} style={{ marginTop: 16 }}>Games, art, writing, and the notes from inside the process.</p>
    {entries.length ? entries.map(entry => <article className={styles.entry} key={entry.id}><p className={styles.eyebrow}>{entry.category} · {entry.published_at.toLocaleDateString('en-US', { timeZone: 'UTC', dateStyle: 'medium' })}</p><h2>{entry.title}</h2><p className={`${styles.prose} ${styles.entryBody}`}>{entry.body}</p></article>) : <div className={styles.empty}><h2>The archive is quiet for now.</h2><p className={styles.prose}>New work and studio dispatches will appear here as they&apos;re published. Nothing has been posted yet.</p></div>}
    <div className={styles.spaces}><Link className={styles.spaceLink} href="/members/gatherings"><h2>Gatherings ↗</h2><p className={styles.note}>Creative studio company for Companion and Champion members.</p></Link><Link className={styles.spaceLink} href="/members/conversations"><h2>Private conversations ↗</h2><p className={styles.note}>A monthly space to explore desires or champion your work, for Champion members.</p></Link></div>
  </>;
}
