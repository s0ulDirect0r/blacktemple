'use client';

import { useRef, useState } from 'react';
import { supportCents, supportMoney, SUPPORT_AMOUNT_ERROR } from '@/lib/support/amount';

export default function SupportForm({ enabled }: { enabled: boolean }) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const attempt = useRef<{ amount: number; id: string } | null>(null);
  const cents = supportCents(amount);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    if (cents === null) { setError(SUPPORT_AMOUNT_ERROR); return; }
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      // Retrying a lost response reuses the same Stripe session.
      if (attempt.current?.amount !== cents) attempt.current = { amount: cents, id: crypto.randomUUID() };
      const response = await fetch('/api/support/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, requestId: attempt.current.id }),
      });
      const result = await response.json();
      if (!response.ok || typeof result.url !== 'string') throw new Error(result.error || 'Checkout is unavailable. Please try again later.');
      window.location.assign(result.url);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Checkout is unavailable. Please try again later.');
      setBusy(false);
      inFlight.current = false;
    }
  }

  return (
    <form onSubmit={submit} className="mt-10 max-w-md space-y-5">
      <div>
        <label htmlFor="support-amount" className="block text-sm text-zinc-200">Your amount in USD</label>
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-white/20 px-4 focus-within:border-white/70">
          <span aria-hidden="true" className="text-zinc-400">$</span>
          <input id="support-amount" name="amount" type="text" inputMode="decimal" autoComplete="off" required maxLength={7}
            value={amount} onChange={event => { setAmount(event.target.value); setError(''); }} disabled={busy || !enabled}
            aria-describedby="support-amount-help support-error" aria-invalid={Boolean(error)}
            className="min-w-0 flex-1 bg-transparent py-4 text-xl text-white outline-none disabled:opacity-50" />
          <span className="text-sm text-zinc-400">USD</span>
        </div>
        <p id="support-amount-help" className="mt-2 text-sm text-zinc-400">Choose any amount from $1 to $1,000. One payment only.</p>
      </div>
      <p id="support-error" role="alert" className="text-sm text-red-300">{error}</p>
      <button type="submit" disabled={busy || !enabled}
        className="w-full rounded-lg border border-white/30 bg-white/5 px-5 py-4 text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:opacity-50">
        {busy ? 'Opening Stripe…' : cents === null ? 'Continue to one-time payment' : `Give ${supportMoney(cents)} USD once`}
      </button>
      {!enabled && <p role="status" className="text-sm text-zinc-400">Support checkout isn&apos;t open yet. Please check back later.</p>}
      <p className="text-sm leading-relaxed text-zinc-400">Secure checkout through Stripe. No subscription or account required.</p>
    </form>
  );
}
