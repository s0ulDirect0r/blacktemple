import { senseHandler, jsonBody, type IdParams } from '@/lib/sense/http';
import { requireOwner } from '@/lib/sense/actor';
import { deleteHabit, updateHabit } from '@/lib/sense/habits';

export const dynamic = 'force-dynamic';

/** `{ name?, description? }` → the habit. */
export const PATCH = senseHandler<IdParams>(async (actor, request, { params }) => {
  requireOwner(actor);
  return updateHabit((await params).id, await jsonBody(request));
});

export const DELETE = senseHandler<IdParams>(async (actor, _request, { params }) => {
  requireOwner(actor);
  await deleteHabit((await params).id);
  return { ok: true };
});
