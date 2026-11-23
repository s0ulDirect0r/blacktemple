import { senseHandler, jsonBody, type IdParams } from '@/lib/sense/http';
import { requireOwner } from '@/lib/sense/actor';
import { addTask } from '@/lib/sense/projects';

export const dynamic = 'force-dynamic';

/** `{ body }` → the project, with the new task last. */
export const POST = senseHandler<IdParams>(async (actor, request, { params }) => {
  requireOwner(actor);
  return addTask((await params).id, (await jsonBody(request)).body);
});
