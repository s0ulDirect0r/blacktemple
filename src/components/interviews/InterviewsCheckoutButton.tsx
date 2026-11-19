'use client';

import { useState } from 'react';

/** Opens Stripe Checkout for the interviews offer. */
export default function InterviewsCheckoutButton({ className, unavailableClassName }: { className: string; unavailableClassName: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/interviews/checkout', { method: 'POST' });
      const body = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !body.url) throw new Error(body.error ?? 'Something went wrong starting checkout. Please try again.');
      window.location.assign(body.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong starting checkout. Please try again.');
      setPending(false);
    }
  }

  return (
    <>
      <button type="button" onClick={start} disabled={pending} className={pending ? `${className} ${unavailableClassName}` : className}>
        {pending ? 'Opening checkout…' : 'Book your interviews'} <span aria-hidden="true">↗</span>
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </>
  );
}
