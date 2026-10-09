'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './membership.module.css';
export default function Confirmation() {
  const [confirmed,setConfirmed] = useState(false), [slow,setSlow] = useState(false);
  useEffect(() => {
    let active = true, tries = 0;
    let timer: ReturnType<typeof setInterval>;
    async function check() {
      try {
        const response = await fetch('/api/members/membership', { cache: 'no-store' });
        if (response.status === 401) { window.location.replace('/login'); return; }
        const data = await response.json();
        if (active && data.access) { setConfirmed(true); clearInterval(timer); return; }
      } catch { /* Keep the account link available during an interrupted return. */ }
      if (active && ++tries >= 12) { setSlow(true); clearInterval(timer); }
    }
    timer = setInterval(check, 3000); void check();
    return () => { active = false; clearInterval(timer); };
  }, []);
  return <div className={styles.empty}><h2>{confirmed ? 'Welcome inside.' : slow ? 'Confirmation is taking a little longer.' : 'Opening your membership…'}</h2>
    <p className={styles.prose}>{confirmed ? 'Your first payment is confirmed. Your membership spaces are ready to enter.' : 'We’re waiting for payment confirmation. Your membership and payment details will appear in My Membership.'}</p>
    <div className={styles.actions}><Link className={styles.button} href={confirmed ? '/members' : '/members/membership'}>{confirmed ? 'Enter the studio ↗' : 'Open My Membership ↗'}</Link></div>
  </div>;
}
