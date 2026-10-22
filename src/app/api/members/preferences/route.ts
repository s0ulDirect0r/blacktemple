import { authenticated, errorResponse, MemberError, privateJson, jsonObject } from '@/lib/membership/http';
import { setEmailUpdates } from '@/lib/membership/preferences';

export async function PATCH(request: Request) {
  try {
    const session = await authenticated(request, true);
    const body = await jsonObject(request);
    if (typeof body.emailUpdates !== 'boolean') throw new MemberError(400, 'Include emailUpdates as true or false.');
    await setEmailUpdates(session.user.id, body.emailUpdates);
    return privateJson({ emailUpdates: body.emailUpdates });
  } catch (error) { return errorResponse(error); }
}
