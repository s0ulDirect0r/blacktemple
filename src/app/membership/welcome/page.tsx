import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { requireMemberSession } from '@/lib/membership/auth';
import { currentMembership } from '@/lib/membership/store';
import { hasAccess, paidMembershipVisible } from '@/lib/membership/config';
import { ownProfile } from '@/lib/temple/store';
import SessionGuard from '@/components/membership/SessionGuard';
import Arrival from '@/components/temple/Arrival';
import styles from '@/components/membership/membership.module.css';
import ui from '@/components/temple/arrival.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Welcome to the Temple', robots: { index: false, follow: false } };

export default async function WelcomePage() {
  if (!paidMembershipVisible()) notFound();
  const session = await requireMemberSession('/membership/welcome');
  if (!hasAccess(await currentMembership(session.user.id))) redirect('/members/membership');
  if (await ownProfile(session.user.id)) redirect('/members/feed');
  return <div className={styles.world}><SessionGuard userId={session.user.id}><main className={ui.shell}>
    <header className={ui.header}><Link href="/membership" className={styles.eyebrow}>Black Temple</Link><span className={ui.confirmed}>✓ Paid membership confirmed</span></header>
    <section className={ui.welcome} aria-label="A welcome from Anansi">
      <div className={ui.video} role="img" aria-label="Placeholder for a future welcome video from Anansi"><div className={ui.door} aria-hidden="true" /><p className={styles.eyebrow}>A welcome from Anansi</p><p className={styles.note}>Welcome video coming soon</p></div>
      <div><p className={styles.eyebrow}>You have a place here</p><h2>Welcome to Black Temple.</h2><p>I’m glad you’re here. This is a space for making things, sharing the process, and following what catches our curiosity.</p><p>Bring something unfinished, ask a question, or just take your time looking around.</p><p>Make yourself at home.<br /><span className={ui.signature}>— Anansi</span></p></div>
    </section>
    <Arrival />
  </main></SessionGuard></div>;
}
