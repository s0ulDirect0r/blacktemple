// One-time setup: authorize the site to read your free/busy time and create
// call events on your Google Calendar. Opens Google's consent screen, then saves
// GOOGLE_REFRESH_TOKEN to .env (the token itself is never printed). If
// CALLS_AVAILABILITY_CALENDAR_ID isn't set yet, it also creates an "Open for
// calls" calendar and saves that calendar's id.
//
// Needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env, from an OAuth client
// of type "Desktop app" in Google Cloud Console.
//
//   npx tsx scripts/google-calendar-auth.ts

import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import dotenv from 'dotenv';

import { GOOGLE_SCOPES } from '../src/lib/calls/google';

dotenv.config();

const ENV_PATH = path.join(process.cwd(), '.env');

// Setup also creates the availability calendar. This scope only reaches
// calendars the app itself creates.
const SETUP_SCOPES = [...GOOGLE_SCOPES, 'https://www.googleapis.com/auth/calendar.app.created'];

function base64url(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function saveEnv(key: string, value: string) {
  const current = await fs.readFile(ENV_PATH, 'utf8').catch(() => '');
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  const next = pattern.test(current)
    ? current.replace(pattern, line)
    : `${current}${current.endsWith('\n') || current === '' ? '' : '\n'}${line}\n`;
  await fs.writeFile(ENV_PATH, next);
}

async function main() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env first.');
  }

  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  const state = base64url(randomBytes(16));

  const code = await new Promise<{ code: string; redirectUri: string }>((resolve, reject) => {
    let redirectUri = '';
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      if (url.pathname !== '/callback') {
        res.writeHead(404).end();
        return;
      }
      const error = url.searchParams.get('error');
      const received = url.searchParams.get('code');
      const ok = !error && received && url.searchParams.get('state') === state;
      res.writeHead(ok ? 200 : 400, { 'Content-Type': 'text/plain' });
      res.end(ok ? 'Calendar connected. You can close this tab.' : `Authorization failed: ${error ?? 'bad state'}`);
      server.close();
      if (ok && received) resolve({ code: received, redirectUri });
      else reject(new Error(`Authorization failed: ${error ?? 'state mismatch'}`));
    });

    server.listen(0, '127.0.0.1', () => {
      redirectUri = `http://127.0.0.1:${(server.address() as AddressInfo).port}/callback`;
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.search = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: SETUP_SCOPES.join(' '),
        access_type: 'offline',
        prompt: 'consent',
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state,
      }).toString();

      console.log('Opening Google consent in your browser. If it does not open, visit:\n');
      console.log(authUrl.toString(), '\n');
      spawn('open', [authUrl.toString()], { stdio: 'ignore', detached: true }).on('error', () => undefined);
    });
  });

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: code.code,
      code_verifier: verifier,
      redirect_uri: code.redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenResponse.ok) throw new Error(`Token exchange failed: ${await tokenResponse.text()}`);
  const tokens = (await tokenResponse.json()) as { refresh_token?: string; access_token: string };
  if (!tokens.refresh_token) {
    throw new Error('Google returned no refresh token. Remove the app at myaccount.google.com/permissions and rerun.');
  }
  await saveEnv('GOOGLE_REFRESH_TOKEN', tokens.refresh_token);
  console.log('Saved GOOGLE_REFRESH_TOKEN to .env.');

  // Prove the grant works: read an hour of free/busy from the primary calendar.
  const now = new Date();
  const check = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      timeMin: now.toISOString(),
      timeMax: new Date(now.getTime() + 3_600_000).toISOString(),
      items: [{ id: 'primary' }],
    }),
  });
  console.log(check.ok ? 'Calendar access works.' : `Calendar check failed: ${await check.text()}`);

  if (process.env.CALLS_AVAILABILITY_CALENDAR_ID) return;
  const created = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: 'Open for calls',
      description: 'Bookable hours for blacktemple.dev/calls. Each event here is a window people can book.',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  });
  if (!created.ok) throw new Error(`Could not create the "Open for calls" calendar: ${await created.text()}`);
  const calendar = (await created.json()) as { id: string };
  await saveEnv('CALLS_AVAILABILITY_CALENDAR_ID', calendar.id);
  console.log('Created the "Open for calls" calendar and saved CALLS_AVAILABILITY_CALENDAR_ID to .env.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
