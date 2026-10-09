'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './membership.module.css';
export default function PendingCheckout({ attemptId, url, status }: { attemptId: string; url: string | null; status: string }) {
  const router = useRouter();
  const [busy,setBusy] = useState(false), [error,setError] = useState('');
  async function close() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/membership/abandon', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attemptId }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error); return; }
      router.refresh();
    } catch { setError('Checkout could not be closed. Please try again.'); }
    finally { setBusy(false); }
  }
  return <div className={styles.empty}><h2>{status === 'activating' ? 'Confirming your membership.' : 'Your checkout is still open.'}</h2>
    <p className={styles.prose}>{status === 'activating' ? 'Card authorization is received. Access will appear here when the first payment is confirmed.' : 'You can continue where you left off, or close this checkout and choose again.'}</p>
    {status !== 'activating' && <div className={styles.actions}>{url && <a className={styles.button} href={url}>Resume checkout ↗</a>}<button type="button" className={styles.secondary} onClick={close} disabled={busy}>Close checkout</button></div>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
  </div>;
}
