import { toNextJsHandler } from 'better-auth/next-js';
import { after } from 'next/server';
import { handleAccountRequest } from '@/lib/membership/auth-route';
import { processNextAccountEmail } from '@/lib/membership/email';
import { authConfigured, memberAuth } from '@/lib/membership/auth';

export const runtime = 'nodejs';
async function handle(request: Request) {
  if (!authConfigured()) return Response.json({ error: 'Sign-in is not configured yet.' }, {
    status: 503,
    headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' },
  });
  const handlers = toNextJsHandler(memberAuth());
  const result = await handleAccountRequest(request, handlers);
  const response = new Response(result.body,{status:result.status,headers:result.headers});
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  after(async () => { try { await processNextAccountEmail(); } catch { console.error('[membership] account email worker needs retry'); } });
  return response;
}
export const GET = handle;
export const POST = handle;
