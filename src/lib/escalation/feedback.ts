import { createHmac, randomUUID } from 'node:crypto';
import { membershipDatabase } from '@/lib/membership/database';
import { MemberError } from '@/lib/membership/errors';

export const FEEDBACK_KINDS = ['fun', 'hard', 'broken', 'note'] as const;
export type FeedbackKind = typeof FEEDBACK_KINDS[number];

export const MAX_FEEDBACK_BODY_BYTES = 450 * 1024;
const MAX_SHOT_BYTES = 300 * 1024;
const MAX_TEXT = 500;
const MAX_ERRORS = 10;
const MAX_ERROR_LENGTH = 500;
const HOURLY_LIMIT = 20;
/** Screenshots are the only large data; keep the newest few hundred. */
const SCREENSHOT_KEEP = 300;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export interface FeedbackInput {
  kind: FeedbackKind;
  text: string | null;
  arena: string | null;
  wave: number | null;
  seconds: number | null;
  killer: string | null;
  fps: number | null;
  build: string | null;
  screen: 'dead' | 'won' | null;
  errors: string[] | null;
  shot: Buffer | null;
}

function shortText(value: unknown, max = 64): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
  return clean || null;
}

function finiteNumber(value: unknown, min: number, max: number): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : null;
}

/** Validate what the game sends. Unknown context fields are dropped; bad screenshots are rejected. */
export function parseFeedback(body: unknown): FeedbackInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new MemberError(400, 'Send feedback as a JSON object.');
  const raw = body as Record<string, unknown>;
  if (!FEEDBACK_KINDS.includes(raw.kind as FeedbackKind)) throw new MemberError(400, 'Choose fun, hard, broken or note.');
  const kind = raw.kind as FeedbackKind;

  let text: string | null = null;
  if (raw.text !== undefined && raw.text !== null) {
    if (typeof raw.text !== 'string' || raw.text.length > MAX_TEXT) throw new MemberError(400, 'Keep the note under 500 characters.');
    text = raw.text.trim() || null;
  }
  if (kind === 'note' && !text) throw new MemberError(400, 'Write a note.');

  const context = raw.context && typeof raw.context === 'object' && !Array.isArray(raw.context) ? raw.context as Record<string, unknown> : {};
  const wave = finiteNumber(context.wave, 0, 100_000);

  let errors: string[] | null = null;
  if (kind === 'broken' && Array.isArray(raw.errors)) {
    errors = raw.errors.filter((e): e is string => typeof e === 'string').slice(0, MAX_ERRORS).map(e => e.slice(0, MAX_ERROR_LENGTH));
    if (!errors.length) errors = null;
  }

  let shot: Buffer | null = null;
  if (kind === 'broken' && raw.shot !== undefined && raw.shot !== null) {
    const prefix = 'data:image/png;base64,';
    if (typeof raw.shot !== 'string' || !raw.shot.startsWith(prefix)) throw new MemberError(400, 'The screenshot must be a PNG.');
    const bytes = Buffer.from(raw.shot.slice(prefix.length), 'base64');
    if (bytes.length > MAX_SHOT_BYTES) throw new MemberError(413, 'The screenshot is too large.');
    if (bytes.length < PNG_SIGNATURE.length || !bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) throw new MemberError(400, 'The screenshot must be a PNG.');
    shot = bytes;
  }

  return {
    kind, text, errors, shot,
    arena: shortText(context.arena),
    wave: wave === null ? null : Math.floor(wave),
    seconds: finiteNumber(context.seconds, 0, 86_400 * 7),
    killer: shortText(context.killer),
    fps: finiteNumber(context.fps, 0, 1000),
    build: shortText(context.build),
    screen: context.screen === 'dead' || context.screen === 'won' ? context.screen : null,
  };
}

/** The first address in the forwarded chain, as Vercel's edge sets it. */
export function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

export function ipHash(ip: string) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error('Membership is not configured');
  return createHmac('sha256', secret).update('escalation-feedback-ip:' + ip).digest('hex');
}

/** Store feedback, enforcing the hourly limit per IP and per member in the same transaction. */
export async function recordFeedback(input: FeedbackInput, who: { userId: string | null; ipHash: string }) {
  const client = await membershipDatabase().connect();
  try {
    await client.query('BEGIN');
    // Serialize per IP so parallel posts can't slip past the count.
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', ['escalation-feedback:' + who.ipHash]);
    const { rows } = await client.query<{ recent: string }>(
      `SELECT count(*) AS recent FROM escalation_feedback
       WHERE created_at > NOW() - INTERVAL '1 hour' AND (ip_hash = $1 OR ($2::text IS NOT NULL AND user_id = $2))`,
      [who.ipHash, who.userId],
    );
    if (Number(rows[0].recent) >= HOURLY_LIMIT) throw new MemberError(429, 'Thanks — that’s plenty of feedback for now. Try again later.');
    await client.query(
      `INSERT INTO escalation_feedback (id, user_id, ip_hash, kind, text, arena, wave, seconds, killer, fps, build, screen, errors, shot)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [randomUUID(), who.userId, who.ipHash, input.kind, input.text, input.arena, input.wave, input.seconds, input.killer,
        input.fps, input.build, input.screen, input.errors ? JSON.stringify(input.errors) : null, input.shot],
    );
    if (input.shot) {
      await client.query(
        `UPDATE escalation_feedback SET shot = NULL WHERE shot IS NOT NULL AND id NOT IN
           (SELECT id FROM escalation_feedback WHERE shot IS NOT NULL ORDER BY created_at DESC LIMIT $1)`,
        [SCREENSHOT_KEEP],
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export interface AdminFeedback {
  id: string;
  kind: FeedbackKind;
  text: string | null;
  arena: string | null;
  wave: number | null;
  seconds: number | null;
  killer: string | null;
  fps: number | null;
  build: string | null;
  screen: string | null;
  errors: string[] | null;
  hasShot: boolean;
  memberName: string | null;
  createdAt: string;
}

/** Newest feedback first, optionally filtered, plus counts by arena and wave. */
export async function adminFeedback(filter: { kind?: string | null; arena?: string | null }, limit = 200) {
  const kind = filter.kind && FEEDBACK_KINDS.includes(filter.kind as FeedbackKind) ? filter.kind : null;
  const arena = filter.arena || null;
  const db = membershipDatabase();
  const [items, counts] = await Promise.all([
    db.query(
      `SELECT f.id, f.kind, f.text, f.arena, f.wave, f.seconds, f.killer, f.fps, f.build, f.screen, f.errors,
              f.shot IS NOT NULL AS has_shot, u.name AS member_name, f.created_at
       FROM escalation_feedback f LEFT JOIN member_user u ON u.id = f.user_id
       WHERE ($1::text IS NULL OR f.kind = $1) AND ($2::text IS NULL OR f.arena = $2)
       ORDER BY f.created_at DESC LIMIT $3`,
      [kind, arena, limit],
    ),
    db.query(
      `SELECT arena, wave, kind, count(*)::int AS n FROM escalation_feedback
       WHERE ($1::text IS NULL OR arena = $1)
       GROUP BY arena, wave, kind ORDER BY arena NULLS LAST, wave NULLS LAST, kind`,
      [arena],
    ),
  ]);
  return {
    items: items.rows.map((row): AdminFeedback => ({
      id: row.id, kind: row.kind, text: row.text, arena: row.arena, wave: row.wave, seconds: row.seconds,
      killer: row.killer, fps: row.fps, build: row.build, screen: row.screen, errors: row.errors,
      hasShot: row.has_shot, memberName: row.member_name, createdAt: new Date(row.created_at).toISOString(),
    })),
    counts: counts.rows as { arena: string | null; wave: number | null; kind: FeedbackKind; n: number }[],
  };
}

export async function feedbackShot(id: string): Promise<Buffer | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { rows } = await membershipDatabase().query<{ shot: Buffer | null }>('SELECT shot FROM escalation_feedback WHERE id = $1', [id]);
  return rows[0]?.shot ?? null;
}
