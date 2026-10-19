import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireMemberSession } from '@/lib/membership/auth';
import { tierById, money } from '@/lib/membership/config';
import CheckoutButton from '@/components/membership/CheckoutButton';
import SessionGuard from '@/components/membership/SessionGuard';
import styles from '@/components/membership/membership.module.css';

export const metadata = { title: 'Choose your membership', robots: { index: false } };
export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ tier?: string }> }) {
  const tier = tierById((await searchParams).tier);
  if (!tier) notFound();
  const session = await requireMemberSession('/membership/checkout?tier=' + tier.id);
  return <div className={styles.world}><main className={styles.authShell}><SessionGuard userId={session.user.id}>
    <p className={styles.eyebrow}>Your three-month term</p><h1 className={styles.title}>{tier.name}</h1>
    <p className={styles.lead}>{money(tier.monthlyCents)} USD per month.</p>
    <p className={styles.prose} style={{ marginTop: 18 }}>Three payments. {money(tier.monthlyCents * 3)} USD total. Your membership ends after three months, with no automatic renewal or fourth payment.</p>
    <ul className={styles.benefits}>{tier.benefits.map(benefit => <li key={benefit}>{benefit}</li>)}</ul>
    <p className={styles.note}>Signed in as {session.user.email}. Payment details belong to this account.</p>
    {process.env.MEMBERSHIP_BILLING_MODE !== 'live' && <p className={styles.badge}>Sandbox checkout · no real payments</p>}
    <CheckoutButton tier={tier.id} monthlyCents={tier.monthlyCents} />
    <p className={styles.note} style={{ marginTop: 24 }}>This is an offering draft. Refunds, cancellation, and missed-session arrangements need review before the live opening.</p>
    <p style={{ marginTop: 26 }}><Link className={styles.textLink} href="/membership">Back to the invitation</Link></p>
  </SessionGuard></main></div>;
}
