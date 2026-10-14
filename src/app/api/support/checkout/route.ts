import { membershipDatabase } from '@/lib/membership/database';
import { membershipStripe } from '@/lib/membership/stripe';
import { supportCents, SUPPORT_AMOUNT_ERROR } from '@/lib/support/amount';
import { supportCheckoutParams } from '@/lib/support/payments';
import { boundedBytes } from '@/lib/temple/request';
import { MemberError } from '@/lib/membership/errors';

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: Request) {
  if (process.env.SUPPORT_CHECKOUT_ENABLED !== 'true') return json({ error: 'Support checkout is not open yet.' }, 503);
  try {
    // A configured canonical origin prevents Host/forwarded-header checkout redirects.
    const origin = new URL(process.env.BETTER_AUTH_URL!).origin;
    if (request.headers.get('origin') !== origin) return json({ error: 'Request origin is not allowed.' }, 403);
    if (!request.headers.get('content-type')?.includes('application/json')) return json({ error: 'Send a JSON request.' }, 415);
    const text = (await boundedBytes(request, 1024)).toString('utf8');
    let body;
    try { body = JSON.parse(text); } catch { return json({ error: 'Send a valid JSON object.' }, 400); }
    const cents = supportCents(body?.amount);
    if (cents === null) return json({ error: SUPPORT_AMOUNT_ERROR }, 400);
    if (typeof body?.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId)) return json({ error: 'Refresh the page and try again.' }, 400);
    // Check schema readiness before allowing any payment to be taken.
    await membershipDatabase().query('SELECT checkout_session_id FROM support_payments LIMIT 0');
    const session = await membershipStripe().checkout.sessions.create(supportCheckoutParams(cents, origin), {
      idempotencyKey: 'bt-support:' + body.requestId,
    });
    if (!session.url || session.status !== 'open') return json({ error: 'This checkout has finished. Refresh the page before starting another payment.' }, 409);
    return json({ url: session.url });
  } catch (error) {
    if (error instanceof MemberError && error.status === 413) return json({ error: 'Request too large.' }, 413);
    console.error('[support] checkout could not be opened');
    return json({ error: 'Checkout is unavailable. Please try again later.' }, 503);
  }
}
