import { MemberError } from '@/lib/membership/errors';
import { senseActor, type SenseActor } from './actor';

const headers = { 'Cache-Control': 'private, no-store' };

/** Authenticate, run, and turn errors into `{ error }` JSON. */
export function senseHandler<Ctx = unknown>(handler: (actor: SenseActor, request: Request, ctx: Ctx) => Promise<unknown>) {
  return async (request: Request, ctx: Ctx) => {
    try {
      const result = await handler(await senseActor(request), request, ctx);
      return result instanceof Response ? result : Response.json(result, { headers });
    } catch (error) {
      if (error instanceof MemberError) return Response.json({ error: error.message }, { status: error.status, headers });
      console.error('[sense] request failed:', error instanceof Error ? error.name : 'UnknownError');
      return Response.json({ error: 'That didn’t work. Try again.' }, { status: 503, headers });
    }
  };
}

export async function jsonBody(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try { body = await request.json(); } catch { throw new MemberError(400, 'Send a JSON object.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new MemberError(400, 'Send a JSON object.');
  return body as Record<string, unknown>;
}

export type IdParams = { params: Promise<{ id: string }> };
