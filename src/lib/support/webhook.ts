import type Stripe from 'stripe';
import { confirmCheckoutSession, releaseExpiredSession } from '@/lib/calls/checkout';
import { stripe } from '@/lib/calls/stripe';
import { handleSupportEvent } from './payments';

interface CheckoutEventDependencies {
  support: (event: Stripe.Event) => Promise<boolean>;
  retrieve: (id: string) => Promise<Stripe.Checkout.Session>;
  confirm: (session: Stripe.Checkout.Session) => Promise<unknown>;
  release: (session: Stripe.Checkout.Session) => Promise<unknown>;
}
const deps: CheckoutEventDependencies = {
  support: handleSupportEvent,
  retrieve: (id: string) => stripe().checkout.sessions.retrieve(id),
  confirm: confirmCheckoutSession,
  release: releaseExpiredSession,
};

/** Support is handled independently and never reaches call/calendar bookkeeping. */
export async function dispatchCheckoutEvent(event: Stripe.Event, dependencies = deps) {
  if (await dependencies.support(event)) return;
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      await dependencies.confirm(await dependencies.retrieve(event.data.object.id));
      break;
    case 'checkout.session.expired':
      await dependencies.release(event.data.object as Stripe.Checkout.Session);
      break;
  }
}
