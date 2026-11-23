import { senseHandler, jsonBody } from '@/lib/sense/http';
import { requireOwner } from '@/lib/sense/actor';
import { createPerson, listPeople } from '@/lib/sense/people';

export const dynamic = 'force-dynamic';

export const GET = senseHandler(async actor => {
  requireOwner(actor);
  return { people: await listPeople() };
});

/** `{ name, note?, cadenceDays?, phone?, telegram?, email? }` → the new person. */
export const POST = senseHandler(async (actor, request) => {
  requireOwner(actor);
  return createPerson(await jsonBody(request));
});
