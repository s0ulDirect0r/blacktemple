'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { memberAuthClient } from '@/lib/membership/auth-client';
import styles from './membership.module.css';

const links = [['/members','Studio'],['/members/gatherings','Gatherings'],['/members/conversations','Private conversations'],['/members/membership','My Membership'],['/members/support','Support']];
export default function MemberNav() {
  const pathname = usePathname();
  return <nav className={styles.tabs} aria-label="Member spaces">{links.map(([href,label]) => <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined}>{label}</Link>)}</nav>;
}
export function SignOut() {
  const [error,setError] = useState('');
  async function signOut() {
    const result = await memberAuthClient.signOut();
    if (result.error) { setError('Sign-out could not be completed. Try again.'); return; }
    window.location.replace('/login');
  }
  return <div><button type="button" className={styles.secondary} onClick={signOut}>Sign out</button>{error && <p role="alert" className={styles.error}>{error}</p>}</div>;
}
