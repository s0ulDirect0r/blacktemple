import { revokeDeviceByToken, sessionForDevice } from '@/lib/sense/devices';

export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };
const bearer = (request: Request) => request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1] ?? '';

/**
 * A device (the desktop app) trades its `btd_` token for an 8-hour admin session.
 * Native clients can't pass BotID, so this sits outside it; the token itself is 256 random bits.
 */
export async function POST(request: Request) {
  try {
    const token = await sessionForDevice(bearer(request));
    if (!token) return Response.json({ error: 'This device isn’t signed in. Sign in with the password again.' }, { status: 401, headers });
    return Response.json({ token }, { headers });
  } catch (error) {
    console.error('[auth/device] session failed:', error instanceof Error ? error.name : 'UnknownError');
    return Response.json({ error: 'Sign-in is unavailable. Try again.' }, { status: 503, headers });
  }
}

/** The device signs itself out. */
export async function DELETE(request: Request) {
  try {
    await revokeDeviceByToken(bearer(request));
    return Response.json({ ok: true }, { headers });
  } catch (error) {
    console.error('[auth/device] sign-out failed:', error instanceof Error ? error.name : 'UnknownError');
    return Response.json({ error: 'Sign-out is unavailable. Try again.' }, { status: 503, headers });
  }
}
