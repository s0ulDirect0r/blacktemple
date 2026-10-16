import type Stripe from 'stripe';
import { sql } from '@/lib/db';
import { supportSiteOrigin, supportStripe, verifySupportStripe } from './config';
import { supportCents, SUPPORT_AMOUNT_ERROR } from './amount';
import { supportCheckoutParams } from './payments';

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
class RequestTooLarge extends Error {}

async function boundedText(request: Request) {
  if (Number(request.headers.get('content-length')) > 1024) throw new RequestTooLarge();
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      total += part.value.length;
      if (total > 1024) throw new RequestTooLarge();
      chunks.push(part.value);
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks).toString('utf8');
}

interface CheckoutDependencies {
  ready: () => Promise<unknown>;
  verify: () => Promise<void>;
  create: (params: Stripe.Checkout.SessionCreateParams, options: Stripe.RequestOptions) => Promise<Pick<Stripe.Checkout.Session, 'url' | 'status'>>;
}
const deps: CheckoutDependencies = {
  ready: () => sql`SELECT checkout_session_id FROM support_payments LIMIT 0`,
  verify: () => verifySupportStripe(),
  create: (params, options) => supportStripe().checkout.sessions.create(params, options),
};

export async function checkoutSupport(request: Request, dependencies = deps) {
  if (process.env.SUPPORT_CHECKOUT_ENABLED !== 'true') return json({ error: 'Support checkout is not open yet.' }, 503);
  try {
    const origin = supportSiteOrigin();
    if (request.headers.get('origin') !== origin) return json({ error: 'Request origin is not allowed.' }, 403);
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return json({ error: 'Send a JSON request.' }, 415);
    let body: unknown;
    try { body = JSON.parse(await boundedText(request)); }
    catch (error) {
      if (error instanceof RequestTooLarge) throw error;
      return json({ error: 'Send a valid JSON object.' }, 400);
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Send a valid JSON object.' }, 400);
    const { amount, requestId } = body as Record<string, unknown>;
    const cents = supportCents(amount);
    if (cents === null) return json({ error: SUPPORT_AMOUNT_ERROR }, 400);
    if (typeof requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) return json({ error: 'Refresh the page and try again.' }, 400);
    // Refuse payment if bookkeeping or the authenticated Stripe account is wrong.
    await dependencies.ready();
    await dependencies.verify();
    const session = await dependencies.create(supportCheckoutParams(cents, origin), { idempotencyKey: 'bt-support:' + requestId });
    if (!session.url || session.status !== 'open') return json({ error: 'This checkout has finished. Refresh the page before starting another payment.' }, 409);
    return json({ url: session.url });
  } catch (error) {
    if (error instanceof RequestTooLarge) return json({ error: 'Request too large.' }, 413);
    console.error('[support] checkout could not be opened');
    return json({ error: 'Checkout is unavailable. Please try again later.' }, 503);
  }
}
