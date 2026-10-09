import Link from 'next/link';
import { requireMemberSession } from '@/lib/membership/auth';
import { currentMembership } from '@/lib/membership/store';
import { hasAccess } from '@/lib/membership/config';
import { gatheringsForMember } from '@/lib/membership/content';
import styles from '@/components/membership/membership.module.css';

export const metadata = { title: 'Gatherings' };

export default async function GatheringsPage() {
  const session = await requireMemberSession('/members/gatherings');
  const membership = await currentMembership(session.user.id);
  if (!hasAccess(membership, 'gatherings')) return <div className={styles.empty}><h2>Creative company.</h2><p className={styles.prose}>A monthly 60-minute group studio gathering is included with Companion and Champion memberships.</p><div className={styles.actions}><Link className={styles.button} href="/membership">Explore the memberships ↗</Link></div></div>;
  const gatherings = await gatheringsForMember(session.user.id);
  return <><h2 className={styles.sectionTitle}>Gatherings</h2><p className={styles.prose} style={{ marginTop: 20 }}>Bring a work in progress, a question, or your curiosity. One 60-minute creative studio gathering each month.</p>{gatherings.length ? gatherings.map(gathering => <article className={styles.entry} key={gathering.id}><h2>{gathering.title}</h2><p className={styles.note}>{gathering.starts_at.toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'long', timeStyle: 'short' })} UTC</p><p className={styles.prose}>{gathering.description}</p>{gathering.meeting_url && <a className={styles.textLink} href={gathering.meeting_url} rel="noreferrer">Enter the gathering ↗</a>}</article>) : <div className={styles.empty}><h2>No gathering has been announced yet.</h2><p className={styles.prose}>The date, invitation, and meeting link will appear here when the next gathering is arranged.</p></div>}</>;
}
