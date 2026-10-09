import { notFound } from 'next/navigation';
import { requireMemberSession } from '@/lib/membership/auth';
import { membershipDatabase } from '@/lib/membership/database';
import Confirmation from '@/components/membership/Confirmation';
import SessionGuard from '@/components/membership/SessionGuard';
import styles from '@/components/membership/membership.module.css';

export const metadata = { title: 'Membership confirmation', robots: { index: false } };
export default async function ReturnPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const session = await requireMemberSession('/members/membership');
  const checkout = (await searchParams).checkout;
  if (!checkout || !(await membershipDatabase().query('SELECT 1 FROM membership_attempts WHERE checkout_session_id=$1 AND user_id=$2', [checkout,session.user.id])).rowCount) notFound();
  return <div className={styles.world}><main className={styles.authShell}><SessionGuard userId={session.user.id}><p className={styles.eyebrow}>Black Temple</p><h1 className={styles.title}>Your place<br />inside.</h1><Confirmation /></SessionGuard></main></div>;
}
