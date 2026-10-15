'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './membership.module.css';
import ConfirmationPortal from './ConfirmationPortal';
import ui from './confirmation.module.css';
export default function Confirmation({returnPath}:{returnPath:string}) {
  const router=useRouter();
  const [slow,setSlow] = useState(false),[retry,setRetry]=useState(0);
  const [confirmed,setConfirmed]=useState(false);
  useEffect(() => {
    let active = true, tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const controller=new AbortController();
    async function check() {
      try {
        const response = await fetch('/api/members/membership', { cache: 'no-store',signal:controller.signal });
        if(!active)return;
        if (response.status === 401) { router.replace('/login?next='+encodeURIComponent(returnPath)); return; }
        if (response.ok && (await response.json()).access) {
          if(active){
            setConfirmed(true);
            router.prefetch('/membership/welcome');
            timer=setTimeout(()=>router.replace('/membership/welcome'),matchMedia('(prefers-reduced-motion: reduce)').matches?0:700);
          }
          return;
        }
      } catch { /* Keep the account link available during an interrupted return. */ }
      if(!active)return;
      if (++tries >= 12) { setSlow(true); return; }
      timer=setTimeout(check,3000);
    }
    void check();
    return () => { active = false; controller.abort();clearTimeout(timer); };
  }, [retry,returnPath,router]);
  return <div className={ui.scene} data-phase={confirmed?'confirmed':slow?'slow':'waiting'}>
    <ConfirmationPortal confirmed={confirmed} slow={slow}/>
    <div className={ui.copy}><h2>{confirmed?'The doorway is open.':slow?'The doorway is taking a little longer.':'A doorway is forming.'}</h2>
      <p className={ui.status} role="status">{confirmed?'First payment confirmed. Opening your Temple identity…':slow?'Payment confirmation hasn’t arrived yet. You can check again or review My Membership.':'Waiting for your first payment to be confirmed.'}</p>
      <p className={styles.note}>Choose who you’ll become inside.<br/>Your Temple name and picture are next.</p>
    </div>
    <div className={ui.actions}>{slow&&!confirmed&&<button className={styles.button} onClick={()=>{setSlow(false);setRetry(value=>value+1);}}>Check confirmation again</button>}<Link className={styles.textLink} href={confirmed?'/membership/welcome':'/members/membership'}>{confirmed?'Continue into the Temple ↗':'My Membership ↗'}</Link></div>
    {confirmed&&<div className={ui.crossing} aria-hidden="true"/>}
  </div>;
}
