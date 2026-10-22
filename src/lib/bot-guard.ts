import { NextResponse } from 'next/server';
import { checkBotId } from 'botid/server';

/**
 * Vercel BotID check for endpoints that cost something when scripted:
 * slot holds, Stripe sessions, admin login. Paths must also be listed in
 * src/instrumentation-client.ts. Outside Vercel, BotID reports humans.
 */
export async function rejectBots(): Promise<NextResponse | null> {
  const { isBot } = await checkBotId();
  return isBot ? NextResponse.json({ error: 'Access denied.' }, { status: 403 }) : null;
}

/** Browsers send Origin on every POST fetch; require it to be this site. */
export function isSameOrigin(request: Request): boolean {
  return request.headers.get('origin') === new URL(request.url).origin;
}
