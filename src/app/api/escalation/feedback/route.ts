import { sessionFromHeaders } from '@/lib/membership/auth';
import { MemberError } from '@/lib/membership/errors';
import { errorJson, json, preflight, requireTrustedWrite } from '@/lib/escalation/http';
import { MAX_FEEDBACK_BODY_BYTES, clientIp, ipHash, parseFeedback, recordFeedback } from '@/lib/escalation/feedback';
import { postSignal } from '@/lib/sense/signals';

export const dynamic = 'force-dynamic';
export const OPTIONS = preflight;

/** Player feedback from the death and victory screens. Signed-in players are linked; anonymous is allowed. */
export async function POST(request: Request) {
  try {
    requireTrustedWrite(request);
    const raw = await request.text();
    if (Buffer.byteLength(raw) > MAX_FEEDBACK_BODY_BYTES) throw new MemberError(413, 'Feedback is too large.');
    let body: unknown;
    try { body = JSON.parse(raw); } catch { throw new MemberError(400, 'Send feedback as a JSON object.'); }
    const input = parseFeedback(body);
    const session = await sessionFromHeaders(request.headers);
    await recordFeedback(input, { userId: session?.user.id ?? null, ipHash: ipHash(clientIp(request)) });
    const where = [input.arena, input.wave !== null ? `wave ${input.wave}` : null, input.screen].filter(Boolean).join(' · ');
    const label = { fun: 'FUN', hard: 'TOO HARD', broken: 'BROKEN', note: 'NOTE' }[input.kind];
    await postSignal('feedback', `ESCALATION feedback: **${label}**${where ? ` · ${where}` : ''}${input.text ? `\n\n> ${input.text.replace(/\n/g, ' ')}` : ''}\n\n${session ? session.user.name : 'anonymous'} #feedback`);
    return json(request, { ok: true });
  } catch (error) {
    return errorJson(request, error);
  }
}
