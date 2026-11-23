import { senseHandler, jsonBody } from '@/lib/sense/http';
import { requireOwner } from '@/lib/sense/actor';
import { setIntention } from '@/lib/sense/intentions';

export const dynamic = 'force-dynamic';

/** `{ period, date, body }` → the intention for the period that holds `date`, set or reworded. */
export const POST = senseHandler(async (actor, request) => {
  requireOwner(actor);
  return setIntention(await jsonBody(request));
});
