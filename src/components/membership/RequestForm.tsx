'use client';
import { useState } from 'react';
import styles from './membership.module.css';
export default function RequestForm({ kind }: { kind: 'support' | 'conversation' }) {
  const [busy,setBusy] = useState(false), [error,setError] = useState(''), [received,setReceived] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/members/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, topic: form.get('topic'), message: form.get('message') }) });
      const data = await response.json();
      if (response.status === 401) { window.location.replace('/login'); return; }
      if (!response.ok) { setError(data.error || 'The request could not be saved.'); return; }
      setReceived(true);
    } catch { setError('The request could not be reached. Please try again.'); }
    finally { setBusy(false); }
  }
  if (received) return <div className={styles.empty}><h2>Your request is saved.</h2><p className={styles.prose}>{kind === 'conversation' ? 'A time has not been booked yet. Use the email link below to arrange it together.' : 'For a reply, write to me using the email link below.'}</p></div>;
  return <form onSubmit={submit} className={styles.form} style={{ marginTop: 28 }}>
    {kind === 'conversation' ? <label>What kind of conversation?<select name="topic"><option>Desire Confessional</option><option>Creative championing</option></select></label> : <label>Topic<input name="topic" required maxLength={120} /></label>}
    <label>{kind === 'conversation' ? 'What would you like to explore?' : 'How can I help?'}<textarea name="message" required minLength={10} maxLength={4000} rows={5} /></label>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <button type="submit" className={styles.button} disabled={busy}>{busy ? 'Saving…' : 'Save request ↗'}</button>
  </form>;
}
