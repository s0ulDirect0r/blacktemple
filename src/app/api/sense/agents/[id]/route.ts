import { senseHandler, type IdParams } from '@/lib/sense/http';
import { requireOwner } from '@/lib/sense/actor';
import { revokeAgentToken } from '@/lib/sense/agents';

export const dynamic = 'force-dynamic';

export const DELETE = senseHandler<IdParams>(async (actor, _request, { params }) => {
  requireOwner(actor);
  await revokeAgentToken((await params).id);
  return { ok: true };
});
