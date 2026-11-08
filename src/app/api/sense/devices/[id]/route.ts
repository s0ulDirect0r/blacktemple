import { senseHandler, type IdParams } from '@/lib/sense/http';
import { requireOwner } from '@/lib/sense/actor';
import { revokeDevice } from '@/lib/sense/devices';

export const dynamic = 'force-dynamic';

export const DELETE = senseHandler<IdParams>(async (actor, _request, { params }) => {
  requireOwner(actor);
  await revokeDevice((await params).id);
  return { ok: true };
});
