import { randomBytes, randomUUID } from 'node:crypto';
import { createAdminToken } from '@/lib/admin-auth';
import { membershipDatabase } from '@/lib/membership/database';
import { MemberError } from '@/lib/membership/errors';
import { tokenHash } from './agents';

/** Device tokens start with this, distinct from agent tokens (`bts_`), so neither can stand in for the other. */
export const DEVICE_TOKEN_PREFIX = 'btd_';

export function isDeviceToken(token: unknown): token is string {
  return typeof token === 'string' && token.startsWith(DEVICE_TOKEN_PREFIX) && token.length <= 200;
}

export async function createDevice(name: unknown) {
  const clean = typeof name === 'string' ? name.replace(/\s+/g, ' ').trim() : '';
  if (!clean || clean.length > 60) throw new MemberError(400, 'Name the device (up to 60 characters).');
  const token = DEVICE_TOKEN_PREFIX + randomBytes(32).toString('base64url');
  const id = randomUUID();
  await membershipDatabase().query('INSERT INTO sense_devices (id, name, token_hash) VALUES ($1, $2, $3)', [id, clean, tokenHash(token)]);
  // The only time the token itself is returned; the device keeps it in its keychain.
  return { id, name: clean, token };
}

export async function listDevices() {
  const { rows } = await membershipDatabase().query<{ id: string; name: string; created_at: Date; last_used_at: Date | null }>(
    'SELECT id, name, created_at, last_used_at FROM sense_devices WHERE revoked_at IS NULL ORDER BY created_at DESC');
  return rows.map(row => ({ id: row.id, name: row.name, createdAt: row.created_at.toISOString(), lastUsedAt: row.last_used_at?.toISOString() ?? null }));
}

export async function revokeDevice(id: string) {
  await membershipDatabase().query('UPDATE sense_devices SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL', [id]);
}

/** A device signing itself out. Returns whether a live device matched. */
export async function revokeDeviceByToken(token: string) {
  if (!isDeviceToken(token)) return false;
  const { rowCount } = await membershipDatabase().query('UPDATE sense_devices SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL', [tokenHash(token)]);
  return Boolean(rowCount);
}

/** Trade a live device token for an 8-hour admin session, or null when it's unknown or revoked. */
export async function sessionForDevice(token: string) {
  if (!isDeviceToken(token)) return null;
  const { rowCount } = await membershipDatabase().query(
    'UPDATE sense_devices SET last_used_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL', [tokenHash(token)]);
  return rowCount ? createAdminToken() : null;
}
