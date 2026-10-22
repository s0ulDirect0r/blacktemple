import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireMemberSession } from '@/lib/membership/auth';
import { currentMembership } from '@/lib/membership/store';
import { FREE_MEMBER_PATHS, hasAccess, paidMembershipVisible } from '@/lib/membership/config';
import MemberNav, { SignOut } from '@/components/membership/MemberNav';
import SessionGuard from '@/components/membership/SessionGuard';
import styles from '@/components/membership/membership.module.css';
import { SITE_NAME } from '@/lib/site';
import { ownProfile } from '@/lib/temple/store';
import { localTemplePreview } from '@/lib/temple/preview';

export const dynamic = 'force-dynamic';
// Each member page names itself, so screen readers announce where a navigation landed.
export const metadata = { title: { default: `Members · ${SITE_NAME}`, template: `%s · Members · ${SITE_NAME}` }, robots: { index: false, follow: false } };
export default async function MembersLayout({ children }: { children: React.ReactNode }) {
  const session = await requireMemberSession();
  // Paid spaces stay out of view for free accounts while the paid offering is hidden.
  const paid = paidMembershipVisible() || hasAccess(await currentMembership(session.user.id));
  const path = (await headers()).get('x-member-path') ?? '/members';
  if (!paid && !FREE_MEMBER_PATHS.includes(path)) redirect('/members');
  const profile = paid ? await ownProfile(session.user.id) : null;
  return <div className={styles.world}><div className={styles.shell}><SessionGuard userId={session.user.id}>
    {localTemplePreview()&&<p className={styles.badge}>Local synthetic preview · test accounts and contributions</p>}
    <header className={styles.memberHeading}><div><p className={styles.eyebrow}>Your place in Black Temple</p><h1 className={styles.title}>Welcome, {profile?.name ?? session.user.name ?? 'traveler'}.</h1></div><SignOut /></header>
    <MemberNav paid={paid} /><main>{children}</main>
    <footer className={styles.footer}><span className="font-pixel" style={{ fontSize: 9 }}>Black Temple</span><span>{paid ? 'Three months of creative company.' : 'A free membership.'}</span></footer>
  </SessionGuard></div></div>;
}
