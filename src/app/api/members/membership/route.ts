import { authenticated, errorResponse, privateJson } from '@/lib/membership/http';
import { hasAccess } from '@/lib/membership/config';
import { accountSnapshot } from '@/lib/membership/store';

export async function GET(request: Request) {
  try {
    const session = await authenticated(request);
    const snapshot = await accountSnapshot(session.user.id);
    return privateJson({ ...snapshot, access: hasAccess(snapshot.membership), user: { name: session.user.name, email: session.user.email } });
  } catch (error) { return errorResponse(error); }
}
