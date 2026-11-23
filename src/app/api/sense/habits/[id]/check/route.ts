import { senseHandler, jsonBody, type IdParams } from '@/lib/sense/http';
import { requireOwner } from '@/lib/sense/actor';
import { checkHabit } from '@/lib/sense/habits';

export const dynamic = 'force-dynamic';

/** `{ day: 'YYYY-MM-DD', done?: boolean }` → the habit. `done: false` takes the day back. */
export const POST = senseHandler<IdParams>(async (actor, request, { params }) => {
  requireOwner(actor);
  const body = await jsonBody(request);
  return checkHabit((await params).id, body.day, body.done !== false);
});
