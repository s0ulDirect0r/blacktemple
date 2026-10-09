import { redirect } from 'next/navigation';
import { pageMetadata } from '@/lib/site';
import { authConfigured, memberSession } from '@/lib/membership/auth';
import { safeReturnPath } from '@/lib/membership/config';
import AuthForm from '@/components/membership/AuthForm';
import styles from '@/components/membership/membership.module.css';

export const metadata = pageMetadata({ title: 'Enter Black Temple', description: 'Sign in to your Black Temple account.', path: '/login' });
export const dynamic = 'force-dynamic';
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; verified?: string; verification?: string; error?: string }> }) {
  const params = await searchParams;
  const next = safeReturnPath(params.next);
  const invalidLink = Boolean(params.verification || params.error);
  if (await memberSession()) redirect(next);
  return <div className={styles.world}><main className={styles.authShell}><p className={styles.eyebrow}>A door into Black Temple</p><h1 className={styles.title}>Come inside.</h1><p className={styles.prose} style={{ marginBottom: 30 }}>Your account holds your membership and your place in the studio.</p>{params.verified === '1' && <p role="status" className={styles.success}>Your email is verified. Sign in to continue.</p>}{invalidLink && <p role="alert" className={styles.error}>This verification link is invalid, expired, or already used. Request a new verification link below.</p>}<AuthForm next={next} configured={authConfigured()} /></main></div>;
}
