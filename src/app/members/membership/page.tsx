import Link from 'next/link';
import { requireMemberSession } from '@/lib/membership/auth';
import { accountSnapshot } from '@/lib/membership/store';
import { hasAccess, money, tierById } from '@/lib/membership/config';
import PendingCheckout from '@/components/membership/PendingCheckout';
import styles from '@/components/membership/membership.module.css';

export const metadata = { title: 'My Membership' };

const date = (value: Date | null) => value ? value.toLocaleDateString('en-US', { timeZone: 'UTC', dateStyle: 'long' }) : 'Waiting for payment';
export default async function MyMembershipPage() {
  const session = await requireMemberSession('/members/membership');
  const { membership, invoices, pending } = await accountSnapshot(session.user.id);
  const active = hasAccess(membership), tier = membership ? tierById(membership.tier)! : null;
  const overdue = membership?.status === 'past_due' && invoices.some(invoice => invoice.status === 'open');
  return <><h2 className={styles.sectionTitle}>My Membership</h2><p className={styles.note} style={{ marginTop: 16 }}>{session.user.email}</p>
    {membership && tier ? <section className={styles.panel} style={{ marginTop: 26 }}><p className={styles.eyebrow}>{tier.name}</p><p className={styles.lead} style={{ marginTop: 18 }}>{active ? (membership.status === 'canceled' ? 'Your membership is canceled. Your access continues through the time you paid for.' : 'Your studio door is open.') : membership.status === 'canceled' ? 'This membership is closed.' : 'Payment confirmation is needed.'}</p><p className={styles.prose} style={{ marginTop: 14 }}>{money(tier.monthlyCents)} USD per month · three payments · {money(tier.monthlyCents * 3)} USD total.</p>
      <dl className={styles.statGrid}><div><dt>Term began</dt><dd>{date(membership.term_start)}</dd></div><div><dt>Term ends automatically</dt><dd>{date(membership.term_end)}</dd></div><div><dt>Access paid through</dt><dd>{date(membership.paid_through)}</dd></div></dl>
      <p className={styles.note}>Payment status: {membership.revoked_at ? 'access under review' : membership.status.replace(/_/g,' ')}. No fourth charge or automatic renewal.</p>
      <p className={styles.note}>{overdue ? 'A monthly payment is overdue. Use “Review / pay” in the payment record below to complete it.' : membership.next_payment_at ?'Next monthly payment: ' + date(membership.next_payment_at) + ' (UTC).' : membership.status === 'canceled' || membership.paid_through?.getTime() === membership.term_end?.getTime() ? 'No further monthly payment is scheduled for this term.' : 'Payment dates are being confirmed.'}</p>
      <div className={styles.tableWrap}><table className={styles.table}><caption className={styles.note} style={{ textAlign: 'left', marginTop: 24 }}>Payment record</caption><thead><tr><th>Membership month</th><th>Amount due</th><th>Status</th><th>Invoice</th></tr></thead><tbody>{invoices.map(invoice => <tr key={invoice.stripe_invoice_id}><td>{date(invoice.period_start)}</td><td>{money(invoice.amount_due)} USD</td><td>{invoice.status}</td><td>{invoice.hosted_url ? <a className={styles.textLink} href={invoice.hosted_url} rel="noreferrer">{invoice.status === 'open' ? 'Review / pay ↗' : 'View ↗'}</a> : '—'}</td></tr>)}</tbody></table></div>
      {!invoices.length && <p className={styles.note} style={{ marginTop: 20 }}>No confirmed invoice has arrived yet.</p>}
      <div className={styles.actions}><Link className={styles.secondary} href="/members/support">Payment or membership help ↗</Link></div>
    </section> : !pending && <div className={styles.empty}><h2>Your account is ready.</h2><p className={styles.prose}>You don&apos;t have a membership term yet. Choose one when you&apos;re ready to come closer.</p><div className={styles.actions}><Link className={styles.button} href="/membership">Explore memberships ↗</Link></div></div>}
    {pending && <PendingCheckout attemptId={pending.id} url={pending.checkout_url} status={pending.status} />}
  </>;
}
