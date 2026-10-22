import { ESCALATION_ORIGIN } from '@/lib/membership/config';
import { MemberError } from '@/lib/membership/errors';

/** Origins allowed to call the ESCALATION API with a member's cookie. */
function allowedOrigins(): string[] {
  const origins = [ESCALATION_ORIGIN];
  // Local game builds can be allowed outside production for testing.
  if (process.env.VERCEL_ENV !== 'production' && process.env.ESCALATION_DEV_ORIGIN) origins.push(process.env.ESCALATION_DEV_ORIGIN);
  return origins;
}

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin');
  const headers: Record<string, string> = { Vary: 'Origin', 'Cache-Control': 'private, no-store' };
  if (origin && allowedOrigins().includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers['Access-Control-Allow-Methods'] = 'GET, PUT, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers['Access-Control-Max-Age'] = '600';
  }
  return headers;
}

export function preflight(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

/** Writes must come from the game or this site, as JSON. */
export function requireTrustedWrite(request: Request) {
  const origin = request.headers.get('origin');
  const site = process.env.BETTER_AUTH_URL ? new URL(process.env.BETTER_AUTH_URL).origin : null;
  if (!origin || !(allowedOrigins().includes(origin) || origin === site)) throw new MemberError(403, 'Request origin is not allowed.');
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new MemberError(415, 'Send a JSON request.');
}

export function json(request: Request, value: unknown, status = 200) {
  return Response.json(value, { status, headers: corsHeaders(request) });
}

export function errorJson(request: Request, error: unknown) {
  if (error instanceof MemberError) return json(request, { error: error.message }, error.status);
  console.error('[escalation] request failed:', error instanceof Error ? error.name : 'UnknownError');
  return json(request, { error: 'That could not be completed. Please try again.' }, 503);
}
