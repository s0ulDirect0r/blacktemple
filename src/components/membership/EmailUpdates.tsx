'use client';
import { useState } from 'react';
import styles from './membership.module.css';

export default function EmailUpdates({ initial }: { initial: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function change(next: boolean) {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/members/preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emailUpdates: next }) });
      if (!response.ok) throw new Error();
      setEnabled(next);
    } catch { setError('That didn’t save. Please try again.'); }
    finally { setBusy(false); }
  }
  return <div className={styles.form}>
    <label className={styles.consent}><input type="checkbox" checked={enabled} disabled={busy} onChange={event => change(event.target.checked)} /><span>Email me occasionally about new work and ESCALATION.</span></label>
    {error && <p role="alert" className={styles.error}>{error}</p>}
  </div>;
}
