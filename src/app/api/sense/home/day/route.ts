import { senseHandler } from '@/lib/sense/http';
import { requireOwner } from '@/lib/sense/actor';
import { closedOn } from '@/lib/sense/intentions';

export const dynamic = 'force-dynamic';

/** `?date=YYYY-MM-DD&tz=Area/City` → what was closed that day. */
export const GET = senseHandler(async (actor, request) => {
  requireOwner(actor);
  const query = new URL(request.url).searchParams;
  return closedOn(query.get('date'), query.get('tz'));
});
