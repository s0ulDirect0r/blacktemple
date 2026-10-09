import Link from 'next/link';
import { requireMemberSession } from '@/lib/membership/auth';
import { currentMembership } from '@/lib/membership/store';
import { hasAccess, MEMBERSHIP_SUPPORT_EMAIL } from '@/lib/membership/config';
import { serviceRequests } from '@/lib/membership/content';
import RequestForm from '@/components/membership/RequestForm';
import styles from '@/components/membership/membership.module.css';

export default async function ConversationsPage() {
  const session = await requireMemberSession('/members/conversations');
  const membership = await currentMembership(session.user.id);
  if (!hasAccess(membership, 'conversations')) return <div className={styles.empty}><h2>A conversation of your own.</h2><p className={styles.prose}>Champion members have one private 45-minute conversation each month: a Desire Confessional or creative championing.</p><div className={styles.actions}><Link className={styles.button} href="/membership">Explore Champion ↗</Link></div></div>;
  const requests = (await serviceRequests(session.user.id)).filter(request => request.kind === 'conversation');
  return <><h2 className={styles.sectionTitle}>Private conversations</h2><p className={styles.prose} style={{ marginTop: 20 }}>What wants your attention? We can explore your desires, or spend time with the creative thing you&apos;re trying to bring to life.</p><p className={styles.note} style={{ marginTop: 20 }}>One 45-minute conversation per paid membership month. Send a request, then we&apos;ll arrange a time together. This form does not book a calendar slot.</p><RequestForm kind="conversation" /><p className={styles.note} style={{ marginTop: 24 }}>To arrange the time, <a className={styles.textLink} href={`mailto:${MEMBERSHIP_SUPPORT_EMAIL}`}>write to me</a> as well.</p>
    {requests.length > 0 && <section style={{ marginTop: 40 }}><h3 className={styles.sectionTitle}>Your requests</h3>{requests.map(request => <article className={styles.entry} key={request.id}><p className={styles.prose}>{request.topic}</p><p className={styles.note}>Request {request.status} · {request.created_at.toLocaleDateString('en-US', { timeZone: 'UTC' })}</p></article>)}</section>}
  </>;
}
