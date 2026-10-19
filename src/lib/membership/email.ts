import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { mkdir, chmod, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { stagingAccountAllowed } from './staging-policy';
import { membershipDatabase, transaction, lock } from './database';

export type AccountEmailKind = 'verify' | 'reset';
export const VERIFICATION_SECONDS = 3600;
export const RESET_SECONDS = 900;
export interface AccountEmail { to: string; subject: string; text: string; html: string }
export function tokenHash(token: string) { return createHash('sha256').update(token).digest('hex'); }
function emailKey() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error('Account email encryption is not configured');
  return createHash('sha256').update('blacktemple-account-email-v1\0' + secret).digest();
}
export function encryptEmail(email: AccountEmail) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', emailKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(email), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(value => value.toString('base64url')).join('.');
}
export function decryptEmail(payload: string): AccountEmail {
  const parts = payload.split('.');
  if (parts.length !== 3) throw new Error('Invalid encrypted email');
  const [iv, tag, data] = parts.map(value => Buffer.from(value, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', emailKey(), iv);
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')) as AccountEmail;
}
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!)); }
export function accountEmail(kind: AccountEmailKind, email: string, url: string): AccountEmail {
  const base = new URL(process.env.BETTER_AUTH_URL!);
  const link = new URL(url);
  if (link.origin !== base.origin || !link.pathname.startsWith('/api/member-auth/') || (base.protocol !== 'https:' && !['localhost','127.0.0.1','[::1]'].includes(base.hostname))) throw new Error('Unsafe account email URL');
  const action = kind === 'verify' ? 'Verify your email' : 'Reset your password';
  const expiry = kind === 'verify' ? 'one hour' : '15 minutes';
  const explanation = kind === 'verify' ? 'Confirm this email address for your Black Temple account.' : 'Choose a new password for your Black Temple account. This will sign out your existing sessions.';
  const text = `${explanation}\n\n${action}: ${link.href}\n\nThis link expires in ${expiry} and can be used once. If you did not request this, you can ignore this email.\n`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${action} for Black Temple</title></head><body style="font:16px/1.6 Arial,sans-serif;color:#171717;background:#fff"><main style="max-width:560px;margin:32px auto;padding:24px"><h1 style="font-size:24px">${action} for Black Temple</h1><p>${explanation}</p><p><a href="${escapeHtml(link.href)}" style="display:inline-block;padding:14px 22px;background:#171717;color:#fff;text-decoration:none">${action}</a></p><p>This link expires in ${expiry} and can be used once.</p><p>If you did not request this, you can ignore this email.</p><p>If the button does not work, use this link:</p><p style="overflow-wrap:anywhere">${escapeHtml(link.href)}</p></main></body></html>`;
  return { to: email, subject: `${action} for Black Temple`, text, html };
}

/** Hooks only persist encrypted jobs. The request never waits on an email provider. */
export async function enqueueAccountEmail(kind: AccountEmailKind, data: { user: { id: string; email: string }; url: string; token: string }) {
  if (!stagingAccountAllowed(data.user.email)) return;
  const email = accountEmail(kind, data.user.email, data.url);
  const hash = tokenHash(data.token), id = `${kind}:${hash}`;
  const addressHash = tokenHash(kind + ':' + data.user.email.toLowerCase());
  const expiresAt = new Date(Date.now() + (kind === 'verify' ? VERIFICATION_SECONDS : RESET_SECONDS) * 1000);
  await transaction(async client => {
    await lock(client, 'account-email:' + addressHash);
    const limit = (await client.query<{ requests: number; recent: boolean; current: boolean }>(`SELECT requests,last_requested_at>NOW()-INTERVAL '60 seconds' AS recent,window_start>NOW()-INTERVAL '1 hour' AS current FROM member_email_rate_limits WHERE address_hash=$1`,[addressHash])).rows[0];
    if (limit?.recent || (limit?.current && limit.requests >= 3)) return;
    await client.query(`INSERT INTO member_email_rate_limits(address_hash,window_start,last_requested_at,requests) VALUES($1,NOW(),NOW(),1)
      ON CONFLICT(address_hash) DO UPDATE SET requests=CASE WHEN member_email_rate_limits.window_start>NOW()-INTERVAL '1 hour' THEN member_email_rate_limits.requests+1 ELSE 1 END,window_start=CASE WHEN member_email_rate_limits.window_start>NOW()-INTERVAL '1 hour' THEN member_email_rate_limits.window_start ELSE NOW() END,last_requested_at=NOW()`,[addressHash]);
    if (kind === 'verify') await client.query('INSERT INTO member_email_tokens(token_hash,user_id,expires_at) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[hash,data.user.id,expiresAt]);
    await client.query('INSERT INTO member_email_jobs(id,kind,encrypted_payload,expires_at) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[id,kind,encryptEmail(email),expiresAt]);
  });
}

export function captureDirectory() {
  const base = new URL(process.env.BETTER_AUTH_URL!);
  const database = new URL(process.env.MEMBERSHIP_DATABASE_URL!);
  const directory = process.env.MEMBERSHIP_EMAIL_CAPTURE_DIR;
  if (process.env.VERCEL_ENV === 'production' || !['localhost','127.0.0.1','[::1]'].includes(base.hostname) || !['localhost','127.0.0.1','[::1]'].includes(database.hostname) || !directory || !path.isAbsolute(directory) || directory.split(path.sep).some(part => ['public','.next','out'].includes(part))) throw new Error('Local email capture requires a private local directory and local services');
  return directory;
}
export class EmailDeliveryError extends Error {
  constructor(public readonly retryable: boolean, public readonly category: string) { super(category); }
}
export async function deliverAccountEmail(id: string, email: AccountEmail, transport: typeof fetch = fetch): Promise<string> {
  if (!stagingAccountAllowed(email.to)) throw new EmailDeliveryError(false,'staging-recipient-not-allowed');
  if (process.env.MEMBERSHIP_EMAIL_MODE === 'capture') {
    const directory = captureDirectory();
    await mkdir(directory,{recursive:true,mode:0o700});
    await chmod(directory,0o700);
    const filename = path.join(directory, tokenHash(id) + '.json');
    try { await writeFile(filename, JSON.stringify({id,...email}), {mode:0o600,flag:'wx'}); }
    catch(error) { if (!(error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST')) throw error; }
    return 'local-capture';
  }
  const key = process.env.MEMBERSHIP_EMAIL_RESEND_API_KEY, from = process.env.MEMBERSHIP_EMAIL_FROM;
  if (process.env.MEMBERSHIP_EMAIL_MODE !== 'resend' || process.env.MEMBERSHIP_EMAIL_SEND_ENABLED !== 'true' || !key || !from || /[\r\n]/.test(from)) throw new EmailDeliveryError(false,'sender-not-activated');
  const response = await transport('https://api.resend.com/emails', {
    method:'POST', headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':'bt-account/'+id},
    body:JSON.stringify({from,to:[email.to],subject:email.subject,text:email.text,html:email.html,...(process.env.MEMBERSHIP_EMAIL_REPLY_TO ? {reply_to:process.env.MEMBERSHIP_EMAIL_REPLY_TO}: {})}),
    signal:AbortSignal.timeout(15000),redirect:'error',
  });
  if (!response.ok) {
    // Keep Resend's error name (e.g. validation_error); its message can echo addresses, so it is not stored.
    const body: unknown = await response.json().catch(() => null);
    const name = body && typeof body === 'object' && 'name' in body && typeof body.name === 'string' && /^[a-z_]{1,40}$/.test(body.name) ? ':' + body.name : '';
    throw new EmailDeliveryError(response.status===429 || response.status>=500,'provider-http-'+response.status+name);
  }
  const result: unknown = await response.json();
  if (!result || typeof result !== 'object' || !('id' in result) || typeof result.id !== 'string') throw new EmailDeliveryError(true,'provider-invalid-response');
  return result.id;
}

/** A durable lease recovers crashes; expired links and exhausted retries are never sent. */
export async function processNextAccountEmail() {
  const job = await transaction(async client => {
    await client.query("UPDATE member_email_jobs SET status='expired',encrypted_payload=NULL,lease_until=NULL WHERE status IN ('pending','processing') AND expires_at<=NOW()");
    const row = (await client.query<{ id:string; encrypted_payload:string; attempts:number }>(`SELECT id,encrypted_payload,attempts FROM member_email_jobs WHERE (status='pending' AND available_at<=NOW()) OR (status='processing' AND lease_until<NOW()) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`)).rows[0];
    if (!row) return null;
    await client.query("UPDATE member_email_jobs SET status='processing',attempts=attempts+1,lease_until=NOW()+INTERVAL '1 minute' WHERE id=$1",[row.id]);
    return row;
  });
  if (!job) return false;
  try {
    const provider = await deliverAccountEmail(job.id,decryptEmail(job.encrypted_payload));
    await membershipDatabase().query("UPDATE member_email_jobs SET status='complete',encrypted_payload=NULL,provider_id=$2,completed_at=NOW(),lease_until=NULL,last_error=NULL WHERE id=$1 AND status='processing' AND attempts=$3",[job.id,provider,job.attempts+1]);
  } catch(error) {
    const retry = !(error instanceof EmailDeliveryError) || error.retryable;
    const exhausted = job.attempts >= 9 || !retry;
    const category = error instanceof EmailDeliveryError ? error.category : 'delivery-failed';
    await membershipDatabase().query("UPDATE member_email_jobs SET status=$2,encrypted_payload=CASE WHEN $2='failed' THEN NULL ELSE encrypted_payload END,lease_until=NULL,available_at=NOW()+$3*INTERVAL '1 second',last_error=$4 WHERE id=$1 AND status='processing' AND attempts=$5",[job.id,exhausted?'failed':'pending',Math.min(300,2**job.attempts*10),category,job.attempts+1]);
    console.error('[membership] account email needs attention:',category);
  }
  return true;
}
