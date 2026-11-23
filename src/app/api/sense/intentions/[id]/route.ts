import { senseHandler, jsonBody, type IdParams } from '@/lib/sense/http';
import { requireOwner } from '@/lib/sense/actor';
import { reviewIntention } from '@/lib/sense/intentions';

export const dynamic = 'force-dynamic';

/** `{ result: 'yes' | 'partly' | 'no', note? }` → the reviewed intention. */
export const PATCH = senseHandler<IdParams>(async (actor, request, { params }) => {
  requireOwner(actor);
  return reviewIntention((await params).id, await jsonBody(request));
});
