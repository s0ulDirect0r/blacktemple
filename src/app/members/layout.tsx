import { requireMemberSession } from '@/lib/membership/auth';
import MemberNav, { SignOut } from '@/components/membership/MemberNav';
import SessionGuard from '@/components/membership/SessionGuard';
import styles from '@/components/membership/membership.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Members', robots: { index: false, follow: false } };
export default async function MembersLayout({ children }: { children: React.ReactNode }) {
  const session = await requireMemberSession();
  return <div className={styles.world}><div className={styles.shell}><SessionGuard userId={session.user.id}>
    <header className={styles.memberHeading}><div><p className={styles.eyebrow}>Your place in Black Temple</p><h1 className={styles.title}>Welcome, {session.user.name}.</h1></div><SignOut /></header>
    <MemberNav /><main>{children}</main>
    <footer className={styles.footer}><span className="font-pixel" style={{ fontSize: 9 }}>Black Temple</span><span>Three months of creative company.</span></footer>
  </SessionGuard></div></div>;
}
