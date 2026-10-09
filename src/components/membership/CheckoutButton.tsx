'use client';
import { useState } from 'react';
import { MEMBERSHIP_TERMS_VERSION, money, type TierId } from '@/lib/membership/config';
import styles from './membership.module.css';

export default function CheckoutButton({ tier, monthlyCents }: { tier: TierId; monthlyCents: number }) {
  const [accepted,setAccepted] = useState(false), [busy,setBusy] = useState(false), [error,setError] = useState('');
  async function checkout(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/membership/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tier, termsAccepted: accepted, termsVersion: MEMBERSHIP_TERMS_VERSION }) });
      const data = await response.json();
      if (response.status === 401) { window.location.replace('/login?next=' + encodeURIComponent('/membership/checkout?tier=' + tier)); return; }
      if (!response.ok || !data.url) { setError(data.error || 'Checkout could not be opened. Try again.'); return; }
      const target = new URL(data.url);
      if (target.protocol !== 'https:' || target.hostname !== 'checkout.stripe.com') throw new Error('Unexpected checkout destination');
      window.location.assign(target.toString());
    } catch { setError('Checkout could not be reached. You can try again; your existing checkout will be resumed.'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={checkout} className={styles.form} style={{ marginTop: 28 }}>
    <label className={styles.consent}><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} required />
      <span>I authorize three monthly payments of {money(monthlyCents)} USD ({money(monthlyCents * 3)} USD total), ending automatically after three months.</span></label>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <button className={styles.button} type="submit" disabled={busy || !accepted}>{busy ? 'Opening Stripe…' : 'Authorize monthly payments ↗'}</button>
    <p className={styles.note}>Stripe saves your card securely. The first payment follows authorization. Access starts when payment is confirmed.</p>
  </form>;
}
