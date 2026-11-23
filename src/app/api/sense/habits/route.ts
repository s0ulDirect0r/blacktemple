import { senseHandler, jsonBody } from '@/lib/sense/http';
import { requireOwner } from '@/lib/sense/actor';
import { createHabit, listHabits } from '@/lib/sense/habits';

export const dynamic = 'force-dynamic';

export const GET = senseHandler(async actor => {
  requireOwner(actor);
  return { habits: await listHabits() };
});

/** `{ name, description? }` → the new habit. */
export const POST = senseHandler(async (actor, request) => {
  requireOwner(actor);
  return createHabit(await jsonBody(request));
});
