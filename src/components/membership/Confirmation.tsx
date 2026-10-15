'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './membership.module.css';
export default function Confirmation({returnPath}:{returnPath:string}) {
  const router=useRouter();
  const [slow,setSlow] = useState(false),[retry,setRetry]=useState(0);
  useEffect(() => {
    let active = true, tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const controller=new AbortController();
    async function check() {
      try {
        const response = await fetch('/api/members/membership', { cache: 'no-store',signal:controller.signal });
        if(!active)return;
        if (response.status === 401) { router.replace('/login?next='+encodeURIComponent(returnPath)); return; }
        if (response.ok && (await response.json()).access) { if(active)router.replace('/membership/welcome'); return; }
      } catch { /* Keep the account link available during an interrupted return. */ }
      if(!active)return;
      if (++tries >= 12) { setSlow(true); return; }
      timer=setTimeout(check,3000);
    }
    void check();
    return () => { active = false; controller.abort();clearTimeout(timer); };
  }, [retry,returnPath,router]);
  return <div className={styles.empty}><h2 aria-live="polite">{slow ? 'Confirmation is taking a little longer.' : 'Opening your membership…'}</h2>
    <p className={styles.prose}>Once your first payment is confirmed, we’ll invite you to choose your Temple name and picture.</p>
    <div className={styles.actions}>{slow&&<button className={styles.button} onClick={()=>{setSlow(false);setRetry(value=>value+1);}}>Check confirmation again</button>}<Link className={styles.textLink} href="/members/membership">My Membership ↗</Link></div>
  </div>;
}
