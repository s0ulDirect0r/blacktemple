'use client';
import { useEffect, useState } from 'react';
import styles from './membership.module.css';

/** Revalidate on Back/Forward and tab focus; never show another account's cached UI. */
export default function SessionGuard({ userId, children }: { userId: string; children: React.ReactNode }) {
  // The server just rendered this page for the current session, so it starts visible. Only a page
  // restored from the back/forward cache is hidden until rechecked; routine checks run silently.
  const [verified, setVerified] = useState(true);
  useEffect(() => {
    let active = true;
    let checking = false;
    async function check(restored: boolean) {
      if (!active || checking) return;
      checking = true;
      if (restored) setVerified(false);
      try {
        const response = await fetch('/api/member-auth/get-session', { cache: 'no-store' });
        if (!response.ok) throw new Error('Session check unavailable');
        const session = await response.json();
        if (!active) return;
        if (!session?.user?.id) { window.location.replace('/login?next=' + encodeURIComponent(location.pathname + location.search)); return; }
        if (session.user.id !== userId) { window.location.reload(); return; }
        setVerified(true);
      } catch {
        // A network blip must not sign a member out; the server still checks every action.
        if (active && restored) window.location.replace('/login');
      }
      finally { checking = false; }
    }
    const pageshow = (event: PageTransitionEvent) => { if (event.persisted) void check(true); };
    const routine = () => { if (document.visibilityState === 'visible') void check(false); };
    window.addEventListener('pageshow', pageshow); window.addEventListener('focus', routine); document.addEventListener('visibilitychange', routine);
    const timer = window.setInterval(routine, 60000);
    return () => { active = false; clearInterval(timer); window.removeEventListener('pageshow', pageshow); window.removeEventListener('focus', routine); document.removeEventListener('visibilitychange', routine); };
  }, [userId]);
  return <>{!verified && <p role="status" className={styles.note}>Checking your session…</p>}<div hidden={!verified}>{children}</div></>;
}
