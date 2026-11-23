import { senseHandler, jsonBody, type IdParams } from '@/lib/sense/http';
import { requireOwner } from '@/lib/sense/actor';
import { deletePerson, updatePerson } from '@/lib/sense/people';

export const dynamic = 'force-dynamic';

/** `{ name?, note?, cadenceDays?, phone?, telegram?, email? }` → the person. */
export const PATCH = senseHandler<IdParams>(async (actor, request, { params }) => {
  requireOwner(actor);
  return updatePerson((await params).id, await jsonBody(request));
});

export const DELETE = senseHandler<IdParams>(async (actor, _request, { params }) => {
  requireOwner(actor);
  await deletePerson((await params).id);
  return { ok: true };
});
