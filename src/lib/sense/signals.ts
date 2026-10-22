import { SYSTEM } from './actor';
import { createPost } from './store';

export type SignalKind = 'member' | 'supporter' | 'feedback';

/**
 * Post something that happened in the Temple to #signals. Best effort: a
 * failed signal is logged and never breaks the sign-up, payment or report
 * that triggered it.
 */
export async function postSignal(kind: SignalKind, body: string) {
  try {
    await createPost(SYSTEM, { channel: 'signals', body, signalKind: kind });
  } catch (error) {
    console.error('[sense] signal failed:', kind, error instanceof Error ? error.name : 'UnknownError');
  }
}

export function dollars(cents: number, currency = 'usd') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
}
