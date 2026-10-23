import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { membershipDatabase } from '@/lib/membership/database';
import { MemberError } from '@/lib/membership/errors';
import type { SenseActor } from './actor';

/** Agent tokens start with this so they're recognizable in logs and configs. */
export const AGENT_TOKEN_PREFIX = 'bts_';

function hash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createAgentToken(label: unknown) {
  const clean = typeof label === 'string' ? label.replace(/\s+/g, ' ').trim() : '';
  if (!clean || clean.length > 60) throw new MemberError(400, 'Name the agent (up to 60 characters).');
  const token = AGENT_TOKEN_PREFIX + randomBytes(32).toString('base64url');
  const id = randomUUID();
  await membershipDatabase().query('INSERT INTO sense_agent_tokens (id, label, token_hash) VALUES ($1, $2, $3)', [id, clean, hash(token)]);
  // The only time the token itself is ever returned.
  return { id, label: clean, token };
}

export async function listAgentTokens() {
  const { rows } = await membershipDatabase().query<{ id: string; label: string; created_at: Date; last_used_at: Date | null }>(
    'SELECT id, label, created_at, last_used_at FROM sense_agent_tokens WHERE revoked_at IS NULL ORDER BY created_at DESC');
  return rows.map(row => ({ id: row.id, label: row.label, createdAt: row.created_at.toISOString(), lastUsedAt: row.last_used_at?.toISOString() ?? null }));
}

export async function revokeAgentToken(id: string) {
  await membershipDatabase().query('UPDATE sense_agent_tokens SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL', [id]);
}

/** The agent a bearer token belongs to, or null. Posts are attributed to the token's name. */
export async function agentFromToken(token: string): Promise<SenseActor | null> {
  if (!token.startsWith(AGENT_TOKEN_PREFIX) || token.length > 200) return null;
  const { rows } = await membershipDatabase().query<{ id: string; label: string }>(
    `UPDATE sense_agent_tokens SET last_used_at = NOW()
     WHERE token_hash = $1 AND revoked_at IS NULL
     RETURNING id, label`,
    [hash(token)],
  );
  return rows[0] ? { kind: 'agent', id: rows[0].id, label: rows[0].label } : null;
}
