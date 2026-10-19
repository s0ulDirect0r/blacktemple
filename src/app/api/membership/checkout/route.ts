import { startMemberCheckout } from '@/lib/membership/billing';
import { isTierId, MEMBERSHIP_TERMS_VERSION } from '@/lib/membership/config';
import { authenticated, errorResponse, MemberError, privateJson, jsonObject } from '@/lib/membership/http';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const session = await authenticated(request, true);
    if (process.env.MEMBERSHIP_BILLING_MODE === 'live' && !session.user.emailVerified) throw new MemberError(403, 'Verify your account email before opening a live membership.');
    const body = await jsonObject(request);
    if (!isTierId(body.tier) || body.termsAccepted !== true || body.termsVersion !== MEMBERSHIP_TERMS_VERSION) throw new MemberError(400, 'Choose a membership and confirm its payment term.');
    return privateJson(await startMemberCheckout(session.user, body.tier));
  } catch (error) { return errorResponse(error); }
}
