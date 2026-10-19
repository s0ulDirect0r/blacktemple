import { stagingAccountAllowed } from './staging-policy';
import { transaction } from './database';
import { tokenHash } from './email';

const prefix = '/api/member-auth';
const postPaths = new Set(['/sign-up/email','/sign-in/email','/sign-out','/send-verification-email','/request-password-reset','/reset-password']);
const getPaths = new Set(['/get-session','/verify-email']);
const generic = () => Response.json({status:true},{headers:{'Cache-Control':'private, no-store'}});
function clientError(status: number, message: string) { return Response.json({message},{status,headers:{'Cache-Control':'private, no-store'}}); }
export function accountCallback(value: unknown, route: '/login' | '/login/reset', origin: string) {
  if (value === undefined) return;
  if (typeof value !== 'string' || /[\\\u0000-\u001f]/.test(value) || value.startsWith('//')) throw new Error('Invalid callback');
  const url = new URL(value,origin);
  if (url.origin !== origin || url.pathname !== route) throw new Error('Invalid callback');
}
export function verificationResult(requestURL: string, state: 'invalid'|'expired'|'used') {
  return Response.redirect(new URL('/login?verification='+state,new URL(process.env.BETTER_AUTH_URL ?? requestURL).origin),303);
}
/** Serialize the native verification handler so a delivered link is accepted once. */
async function verifyOnce(request: Request, handler: (request: Request) => Promise<Response>) {
  const url = new URL(request.url), token = url.searchParams.get('token');
  if (!token || token.length > 4096) return verificationResult(request.url,'invalid');
  const origin = new URL(process.env.BETTER_AUTH_URL!).origin;
  try { accountCallback(url.searchParams.get('callbackURL') ?? undefined,'/login',origin); }
  catch { return clientError(400,'This account link has an invalid redirect.'); }
  url.searchParams.set('callbackURL','/login?verified=1');
  return transaction(async client => {
    const row = (await client.query<{expires_at:Date;consumed_at:Date|null}>('SELECT expires_at,consumed_at FROM member_email_tokens WHERE token_hash=$1 FOR UPDATE',[tokenHash(token)])).rows[0];
    if (!row) return verificationResult(request.url,'invalid');
    if (row.consumed_at) return verificationResult(request.url,'used');
    if (row.expires_at <= new Date()) return verificationResult(request.url,'expired');
    const result = await handler(new Request(url,request));
    if (result.ok || (result.status >= 300 && result.status < 400 && !result.headers.get('location')?.includes('error='))) await client.query('UPDATE member_email_tokens SET consumed_at=NOW() WHERE token_hash=$1',[tokenHash(token)]);
    return result;
  });
}
/** Restrict the exposed auth API, callbacks, origins and enumeration-sensitive responses. */
export async function handleAccountRequest(request: Request, handlers: {GET:(request:Request)=>Promise<Response>;POST:(request:Request)=>Promise<Response>}) {
  const url = new URL(request.url), route = url.pathname.slice(prefix.length);
  const sensitive = ['/sign-up/email','/send-verification-email','/request-password-reset'].includes(route);
  const started = Date.now();
  try {
    if (request.method === 'GET') {
      if (!getPaths.has(route) && !/^\/reset-password\/[A-Za-z0-9_-]{1,128}$/.test(route)) return clientError(404,'Account action not found.');
      if (route === '/verify-email') return await verifyOnce(request,handlers.GET);
      if (route.startsWith('/reset-password/')) {
        try { accountCallback(url.searchParams.get('callbackURL') ?? undefined,'/login/reset',new URL(process.env.BETTER_AUTH_URL!).origin); }
        catch { return clientError(400,'This account link has an invalid redirect.'); }
        url.searchParams.set('callbackURL','/login/reset');
        return await handlers.GET(new Request(url,request));
      }
      return await handlers.GET(request);
    }
    if (!postPaths.has(route)) return clientError(404,'Account action not found.');
    const origin = new URL(process.env.BETTER_AUTH_URL!).origin;
    if (request.headers.get('origin') !== origin) return clientError(403,'Request origin is not allowed.');
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return clientError(415,'Send a JSON request.');
    const raw = await request.text();
    if (Buffer.byteLength(raw)>16384) return clientError(413,'Account request is too large.');
    let body: Record<string, unknown>;
    try {
      const value: unknown = JSON.parse(raw);
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
      body = value as Record<string,unknown>;
      if ('callbackURL' in body) accountCallback(body.callbackURL,'/login',origin);
      if ('redirectTo' in body) accountCallback(body.redirectTo,'/login/reset',origin);
    } catch { return clientError(400,'Send a valid account request with a local redirect.'); }
    // No native account creation or email job occurs for an unapproved staging address.
    if ((sensitive || route === '/sign-in/email') && !stagingAccountAllowed(body.email)) {
      return sensitive ? generic() : clientError(401,'That email and password could not sign you in.');
    }
    if (route === '/send-verification-email' || route === '/sign-up/email') body.callbackURL='/login?verified=1';
    if (route === '/request-password-reset') body.redirectTo='/login/reset';
    const headers = new Headers(request.headers);
    headers.delete('content-length');
    // These public request forms must give identical responses even when already signed in.
    if (route === '/send-verification-email' || route === '/request-password-reset') headers.delete('cookie');
    const result = await handlers.POST(new Request(request.url,{method:'POST',headers,body:JSON.stringify(body)}));
    if (sensitive && result.ok) return generic();
    if (route === '/sign-in/email' && !result.ok && result.status!==429) return clientError(401,'That email and password could not sign you in.');
    return result;
  } catch {
    // Neither provider errors nor token/recipient details are returned or logged.
    console.error('[membership] account request needs attention');
    return clientError(503,'Account service is temporarily unavailable. Please try again.');
  } finally {
    // Only local DB work runs before this floor; delivery happens in the durable worker.
    if (sensitive) await new Promise(resolve=>setTimeout(resolve,Math.max(0,500-(Date.now()-started))));
  }
}
