import { sessionFromHeaders } from '@/lib/membership/auth';
import { MemberError } from '@/lib/membership/errors';
import { errorJson, json, preflight, requireTrustedWrite } from '@/lib/escalation/http';
import { MAX_SAVE_BYTES, loadSave, storeSave } from '@/lib/escalation/store';

export const dynamic = 'force-dynamic';
export const OPTIONS = preflight;

/** The member's ESCALATION account document (all character slots). */
export async function GET(request: Request) {
  try {
    const session = await sessionFromHeaders(request.headers);
    if (!session) return json(request, { error: 'Not signed in.' }, 401);
    const save = await loadSave(session.user.id);
    return save ? json(request, save) : json(request, { document: null }, 404);
  } catch (error) {
    return errorJson(request, error);
  }
}

export async function PUT(request: Request) {
  try {
    requireTrustedWrite(request);
    const session = await sessionFromHeaders(request.headers);
    if (!session) return json(request, { error: 'Not signed in.' }, 401);
    const raw = await request.text();
    if (Buffer.byteLength(raw) > MAX_SAVE_BYTES) throw new MemberError(413, 'Save is too large.');
    let document: unknown;
    try { document = JSON.parse(raw); } catch { throw new MemberError(400, 'Send the save as a JSON object.'); }
    if (!document || typeof document !== 'object' || Array.isArray(document)) throw new MemberError(400, 'Send the save as a JSON object.');
    const updatedAt = await storeSave(session.user.id, document as Record<string, unknown>);
    return json(request, { updatedAt });
  } catch (error) {
    return errorJson(request, error);
  }
}
