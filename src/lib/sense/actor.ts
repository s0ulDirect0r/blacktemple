import { verifyAdminRequest } from '@/lib/admin-auth';
import { MemberError } from '@/lib/membership/errors';
import { AGENT_TOKEN_PREFIX, agentFromToken } from './agents';

/** Who is acting in Sense: Matthew (owner), an agent with a token, later members, and the Temple itself (system). */
export interface SenseActor {
  kind: 'owner' | 'agent' | 'member' | 'system';
  id: string | null;
  label: string;
}

export const OWNER: SenseActor = { kind: 'owner', id: null, label: 'Matthew' };
export const SYSTEM: SenseActor = { kind: 'system', id: null, label: 'Temple' };

/** Authenticate a Sense request: the admin login, or an agent token (`Authorization: Bearer bts_…`). */
export async function senseActor(request: Request): Promise<SenseActor> {
  const bearer = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (bearer?.startsWith(AGENT_TOKEN_PREFIX)) {
    const agent = await agentFromToken(bearer);
    if (agent) return agent;
    throw new MemberError(401, 'That agent token isn’t valid. It may have been revoked.');
  }
  if (await verifyAdminRequest(request)) return OWNER;
  throw new MemberError(401, 'Sign in to the admin first.');
}

/** Some actions (like minting agent tokens) are Matthew's alone. */
export function requireOwner(actor: SenseActor) {
  if (actor.kind !== 'owner') throw new MemberError(403, 'Only Matthew can do that.');
}
