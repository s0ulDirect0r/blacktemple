import { senseHandler, jsonBody, type IdParams } from '@/lib/sense/http';
import { requireOwner } from '@/lib/sense/actor';
import { deleteTask, updateTask } from '@/lib/sense/projects';

export const dynamic = 'force-dynamic';

/** `{ body?, done? }` → the task's project. */
export const PATCH = senseHandler<IdParams>(async (actor, request, { params }) => {
  requireOwner(actor);
  return updateTask((await params).id, await jsonBody(request));
});

export const DELETE = senseHandler<IdParams>(async (actor, _request, { params }) => {
  requireOwner(actor);
  await deleteTask((await params).id);
  return { ok: true };
});
