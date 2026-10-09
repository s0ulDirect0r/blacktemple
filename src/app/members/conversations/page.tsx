import Link from 'next/link';
import { requireMemberSession } from '@/lib/membership/auth';
import { currentMembership } from '@/lib/membership/store';
import { hasAccess, MEMBERSHIP_SUPPORT_EMAIL } from '@/lib/membership/config';
import ConversationBooking from '@/components/membership/ConversationBooking';
import styles from '@/components/membership/membership.module.css';

export default async function ConversationsPage() {
  const session = await requireMemberSession('/members/conversations');
  const membership = await currentMembership(session.user.id);
  if (!hasAccess(membership, 'conversations')) return <div className={styles.empty}><h2>A conversation of your own.</h2><p className={styles.prose}>Champion members have one private 90-minute conversation each month: a Desire Confessional or creative championing.</p><div className={styles.actions}><Link className={styles.button} href="/membership">Explore Champion ↗</Link></div></div>;
  return <><h2 className={styles.sectionTitle}>Private conversations</h2><p className={styles.prose} style={{ marginTop: 20 }}>What wants your attention? We can explore your desires, or spend time with the creative thing you&apos;re trying to bring to life.</p><p className={styles.note} style={{ marginTop: 20 }}>One 90-minute conversation per paid membership month. Choose a time below; it goes straight onto the calendar with a video link. To change a booking, <a className={styles.textLink} href={`mailto:${MEMBERSHIP_SUPPORT_EMAIL}`}>write to me</a>.</p>
    <ConversationBooking />
  </>;
}
