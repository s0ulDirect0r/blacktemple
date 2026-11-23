import { senseHandler, jsonBody, type IdParams } from '@/lib/sense/http';
import { requireOwner } from '@/lib/sense/actor';
import { markTalked } from '@/lib/sense/people';

export const dynamic = 'force-dynamic';

/** `{ day: 'YYYY-MM-DD', talked?: boolean }` → the person. `talked: false` takes the day back. */
export const POST = senseHandler<IdParams>(async (actor, request, { params }) => {
  requireOwner(actor);
  const body = await jsonBody(request);
  return markTalked((await params).id, body.day, body.talked !== false);
});
