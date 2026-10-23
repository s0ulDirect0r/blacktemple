import { senseHandler } from '@/lib/sense/http';
import { exportVault } from '@/lib/sense/export';
import { requireOwner } from '@/lib/sense/actor';

export const dynamic = 'force-dynamic';

/** Everything as a zip that opens as an Obsidian vault. `?tz=America/Chicago` files posts by local day. */
export const GET = senseHandler(async (actor, request) => {
  requireOwner(actor);
  return exportVault(new URL(request.url).searchParams.get('tz'));
});
