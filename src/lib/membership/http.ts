import { sessionFromHeaders } from './auth';
import { MemberError } from './errors';
export { MemberError } from './errors';
export async function authenticated(request: Request, mutating = false) {
  if (mutating) {
    const allowedOrigin = process.env.BETTER_AUTH_URL;
    if (!allowedOrigin || request.headers.get('origin') !== new URL(allowedOrigin).origin) throw new MemberError(403, 'Request origin is not allowed.');
    if (!request.headers.get('content-type')?.includes('application/json')) throw new MemberError(415, 'Send a JSON request.');
  }
  const session = await sessionFromHeaders(request.headers);
  if (!session) throw new MemberError(401, 'Please sign in again.');
  return session;
}
export function errorResponse(error: unknown) {
  if (error instanceof MemberError) return Response.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
  console.error('[membership] request failed:', error instanceof Error ? error.name : 'UnknownError');
  return Response.json({ error: 'That could not be completed. Please try again or contact support.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
}
export function privateJson(value: unknown, status = 200) { return Response.json(value, { status, headers: { 'Cache-Control': 'private, no-store' } }); }
export async function jsonObject(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try { body = await request.json(); } catch { throw new MemberError(400, 'Send a valid JSON object.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new MemberError(400, 'Send a valid JSON object.');
  return body as Record<string, unknown>;
}
