import { sessionFromHeaders } from '@/lib/membership/auth';
import { errorJson, json, preflight } from '@/lib/escalation/http';
import { supportFor } from '@/lib/escalation/store';

export const dynamic = 'force-dynamic';
export const OPTIONS = preflight;

/** Who is playing: the signed-in Black Temple member, or 401. */
export async function GET(request: Request) {
  try {
    const session = await sessionFromHeaders(request.headers);
    if (!session) return json(request, { error: 'Not signed in.' }, 401);
    const support = await supportFor(session.user.id);
    return json(request, { member: { id: session.user.id, name: session.user.name, ...support } });
  } catch (error) {
    return errorJson(request, error);
  }
}
