import { senseHandler, jsonBody } from '@/lib/sense/http';
import { requireOwner } from '@/lib/sense/actor';
import { createAgentToken, listAgentTokens } from '@/lib/sense/agents';

export const dynamic = 'force-dynamic';

export const GET = senseHandler(async actor => {
  requireOwner(actor);
  return { agents: await listAgentTokens() };
});

/** `{ label }` → `{ id, label, token }`. The token is shown this once. */
export const POST = senseHandler(async (actor, request) => {
  requireOwner(actor);
  return createAgentToken((await jsonBody(request)).label);
});
