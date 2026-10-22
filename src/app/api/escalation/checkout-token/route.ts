import { sessionFromHeaders } from '@/lib/membership/auth';
import { errorJson, json, preflight, requireTrustedWrite } from '@/lib/escalation/http';
import { checkoutToken } from '@/lib/escalation/store';

export const dynamic = 'force-dynamic';
export const OPTIONS = preflight;

/** A signed token the game passes to its checkout, so the payment links to this member. */
export async function POST(request: Request) {
  try {
    requireTrustedWrite(request);
    const session = await sessionFromHeaders(request.headers);
    if (!session) return json(request, { error: 'Not signed in.' }, 401);
    return json(request, { token: await checkoutToken(session.user.id) });
  } catch (error) {
    return errorJson(request, error);
  }
}
