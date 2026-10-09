'use client';
import { useEffect, useState } from 'react';
import styles from './membership.module.css';

/** Revalidate on Back/Forward and tab focus; never show another account's cached UI. */
export default function SessionGuard({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [verified, setVerified] = useState(false);
  useEffect(() => {
    let active = true;
    let checking = false;
    async function check() {
      if (!active || checking) return;
      checking = true;
      setVerified(false);
      try {
        const response = await fetch('/api/member-auth/get-session', { cache: 'no-store' });
        const session = response.ok ? await response.json() : null;
        if (!active) return;
        if (!session?.user?.id) { window.location.replace('/login?next=' + encodeURIComponent(location.pathname + location.search)); return; }
        if (session.user.id !== userId) { window.location.reload(); return; }
        setVerified(true);
      } catch { if (active) window.location.replace('/login'); }
      finally { checking = false; }
    }
    void check();
    const focus = () => { if (document.visibilityState === 'visible') void check(); };
    window.addEventListener('pageshow', check); window.addEventListener('focus', check); document.addEventListener('visibilitychange', focus);
    const timer = window.setInterval(check, 60000);
    return () => { active = false; clearInterval(timer); window.removeEventListener('pageshow', check); window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', focus); };
  }, [userId]);
  return <>{!verified && <p role="status" className={styles.note}>Checking your session…</p>}<div hidden={!verified}>{children}</div></>;
}
