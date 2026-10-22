import { verifyAdminRequest } from '@/lib/admin-auth';
import { MemberError } from '@/lib/membership/errors';

/** Who is acting in Sense. Only the owner today; agents and members arrive through this seam. */
export interface SenseActor {
  kind: 'owner' | 'agent' | 'member' | 'system';
  id: string | null;
  label: string;
}

export const OWNER: SenseActor = { kind: 'owner', id: null, label: 'Matthew' };
export const SYSTEM: SenseActor = { kind: 'system', id: null, label: 'Temple' };

/** Authenticate a Sense API request. Today: the admin token. Later: agent tokens and member sessions. */
export async function senseActor(request: Request): Promise<SenseActor> {
  if (await verifyAdminRequest(request)) return OWNER;
  throw new MemberError(401, 'Sign in to the admin first.');
}
