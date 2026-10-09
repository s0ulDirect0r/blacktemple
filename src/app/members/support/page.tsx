import { requireMemberSession } from '@/lib/membership/auth';
import { MEMBERSHIP_SUPPORT_EMAIL } from '@/lib/membership/config';
import { serviceRequests } from '@/lib/membership/content';
import RequestForm from '@/components/membership/RequestForm';
import styles from '@/components/membership/membership.module.css';

export default async function SupportPage() {
  const session = await requireMemberSession('/members/support');
  const requests = (await serviceRequests(session.user.id)).filter(request => request.kind === 'support');
  return <><h2 className={styles.sectionTitle}>Let&apos;s sort it out.</h2><p className={styles.prose} style={{ marginTop: 20 }}>Questions about a payment, access, changing plans, or a conversation? Leave a note here, and <a className={styles.textLink} href={`mailto:${MEMBERSHIP_SUPPORT_EMAIL}`}>write to me</a> for a reply.</p><RequestForm kind="support" /><p className={styles.note} style={{ marginTop: 24 }}>Cancellation, refunds, and unused-session arrangements are still being reviewed for this offering draft. No refund or change is made automatically by sending a request.</p>{requests.length > 0 && <section style={{ marginTop: 40 }}><h3 className={styles.sectionTitle}>Your saved requests</h3>{requests.map(request => <article className={styles.entry} key={request.id}><p className={styles.prose}>{request.topic}</p><p className={styles.note}>{request.status} · {request.created_at.toLocaleDateString('en-US', { timeZone: 'UTC' })}</p></article>)}</section>}</>;
}
