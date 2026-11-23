import { senseHandler, jsonBody, type IdParams } from '@/lib/sense/http';
import { requireOwner } from '@/lib/sense/actor';
import { deleteProject, updateProject } from '@/lib/sense/projects';

export const dynamic = 'force-dynamic';

/** `{ name?, description? }` → the project. */
export const PATCH = senseHandler<IdParams>(async (actor, request, { params }) => {
  requireOwner(actor);
  return updateProject((await params).id, await jsonBody(request));
});

export const DELETE = senseHandler<IdParams>(async (actor, _request, { params }) => {
  requireOwner(actor);
  await deleteProject((await params).id);
  return { ok: true };
});
