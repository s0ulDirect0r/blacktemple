import Link from 'next/link';
import { requireMemberSession } from '@/lib/membership/auth';
import { currentMembership } from '@/lib/membership/store';
import { hasAccess } from '@/lib/membership/config';
import { studioForMember } from '@/lib/membership/content';
import styles from '@/components/membership/membership.module.css';

export const metadata = { title: 'Studio' };

export default async function StudioPage() {
  const session = await requireMemberSession('/members');
  const membership = await currentMembership(session.user.id);
  if (!hasAccess(membership)) return <><h2 className={styles.sectionTitle}>The studio</h2><div className={styles.empty}><h2>A place is waiting for you.</h2><p className={styles.prose}>Your account is ready. A paid membership opens the studio archive and monthly dispatches.</p><div className={styles.actions}><Link className={styles.button} href="/membership">Choose your membership ↗</Link><Link className={styles.secondary} href="/members/membership">Check My Membership</Link></div></div></>;
  const entries = await studioForMember(session.user.id);
  return <><p className={styles.eyebrow}>Members studio</p><h2 className={styles.lead} style={{ marginTop: 16 }}>Work as it comes into being.</h2><p className={styles.prose} style={{ marginTop: 16 }}>Games, art, writing, and the notes from inside the process.</p>
    {entries.length ? entries.map(entry => <article className={styles.entry} key={entry.id}><p className={styles.eyebrow}>{entry.category} · {entry.published_at.toLocaleDateString('en-US', { timeZone: 'UTC', dateStyle: 'medium' })}</p><h2>{entry.title}</h2><p className={`${styles.prose} ${styles.entryBody}`}>{entry.body}</p></article>) : <div className={styles.empty}><h2>The archive is quiet for now.</h2><p className={styles.prose}>New work and studio dispatches will appear here as they&apos;re published. Nothing has been posted yet.</p></div>}
    <div className={styles.spaces}><Link className={styles.spaceLink} href="/members/gatherings"><h2>Gatherings ↗</h2><p className={styles.note}>Creative studio company for Companion and Champion members.</p></Link><Link className={styles.spaceLink} href="/members/conversations"><h2>Private conversations ↗</h2><p className={styles.note}>A monthly space to explore desires or champion your work, for Champion members.</p></Link></div>
  </>;
}
