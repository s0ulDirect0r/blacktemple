import { createServiceRequest, serviceRequests } from '@/lib/membership/content';
import { authenticated, errorResponse, MemberError, privateJson, jsonObject } from '@/lib/membership/http';
export async function GET(request: Request) {
  try { return privateJson({ requests: await serviceRequests((await authenticated(request)).user.id) }); }
  catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const session = await authenticated(request, true);
    const body = await jsonObject(request);
    if ((body.kind !== 'support' && body.kind !== 'conversation') || typeof body.topic !== 'string' || typeof body.message !== 'string') throw new MemberError(400, 'Include a request type, topic, and message.');
    return privateJson(await createServiceRequest(session.user.id, body.kind, body.topic, body.message), 201);
  } catch (error) { return errorResponse(error); }
}
