import { senseHandler } from '@/lib/sense/http';
import { requireOwner } from '@/lib/sense/actor';
import { homeFor } from '@/lib/sense/intentions';

export const dynamic = 'force-dynamic';

/** `?date=YYYY-MM-DD&tz=Area/City` (today, where Matthew is) → the five periods with their intentions, and a year of daily closed counts. */
export const GET = senseHandler(async (actor, request) => {
  requireOwner(actor);
  const query = new URL(request.url).searchParams;
  return homeFor(query.get('date'), query.get('tz'));
});
