import { abandonMemberCheckout } from '@/lib/membership/billing';
import { authenticated, errorResponse, MemberError, privateJson, jsonObject } from '@/lib/membership/http';

export async function POST(request: Request) {
  try {
    const session = await authenticated(request, true);
    const body = await jsonObject(request);
    if (typeof body.attemptId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.attemptId)) throw new MemberError(400, 'Checkout was not found.');
    await abandonMemberCheckout(session.user.id, body.attemptId);
    return privateJson({ closed: true });
  } catch (error) { return errorResponse(error); }
}
