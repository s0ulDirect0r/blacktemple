import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { membershipDatabase, transaction } from '@/lib/membership/database';
import { MemberError } from '@/lib/membership/errors';
import type { SenseActor } from './actor';
import { extractLinks, extractTags, linkKey } from './text';

const MAX_POST = 20000;
const MAX_NOTE = 200000;
const PAGE = 60;

export interface SensePost {
  id: string;
  channel: string;
  parentId: string | null;
  author: { kind: SenseActor['kind']; label: string };
  body: string;
  signalKind: string | null;
  replyCount: number;
  createdAt: string;
  editedAt: string | null;
}

export interface SenseNote {
  id: string;
  title: string;
  body: string;
  author: { kind: SenseActor['kind']; label: string };
  createdAt: string;
  updatedAt: string;
}

interface PostRow {
  id: string; channel: string; parent_id: string | null; author_kind: SenseActor['kind']; author_label: string;
  body: string; signal_kind: string | null; reply_count?: string | number; created_at: Date; edited_at: Date | null;
}

function toPost(row: PostRow): SensePost {
  return {
    id: row.id, channel: row.channel, parentId: row.parent_id, author: { kind: row.author_kind, label: row.author_label },
    body: row.body, signalKind: row.signal_kind, replyCount: Number(row.reply_count ?? 0),
    createdAt: row.created_at.toISOString(), editedAt: row.edited_at?.toISOString() ?? null,
  };
}

function toNote(row: { id: string; title: string; body: string; author_kind: SenseActor['kind']; author_label: string; created_at: Date; updated_at: Date }): SenseNote {
  return {
    id: row.id, title: row.title, body: row.body, author: { kind: row.author_kind, label: row.author_label },
    createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString(),
  };
}

const POST_COLUMNS = `p.id, c.slug AS channel, p.parent_id, p.author_kind, p.author_label, p.body, p.signal_kind, p.created_at, p.edited_at,
  (SELECT count(*) FROM sense_posts r WHERE r.parent_id = p.id AND r.deleted_at IS NULL) AS reply_count`;

function cleanBody(body: unknown, max: number) {
  if (typeof body !== 'string') throw new MemberError(400, 'Write something first.');
  const text = body.replace(/\r\n/g, '\n').trimEnd();
  if (!text.trim()) throw new MemberError(400, 'Write something first.');
  if (text.length > max) throw new MemberError(413, 'That’s too long for one post.');
  return text;
}

function cleanTitle(title: unknown) {
  if (typeof title !== 'string') throw new MemberError(400, 'Give the note a title.');
  const clean = title.replace(/[\[\]|\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean || clean.length > 200) throw new MemberError(400, 'Note titles are 1–200 characters, without [ ] or |.');
  return clean;
}

/** Re-derive links and tags for a post or note after it changes. */
async function reindex(client: PoolClient, kind: 'post' | 'note', id: string, text: string) {
  await client.query('DELETE FROM sense_links WHERE source_kind = $1 AND source_id = $2', [kind, id]);
  await client.query('DELETE FROM sense_tags WHERE source_kind = $1 AND source_id = $2', [kind, id]);
  const links = extractLinks(text);
  const tags = extractTags(text);
  if (links.length) {
    await client.query(
      'INSERT INTO sense_links (source_kind, source_id, target, title) SELECT $1, $2, unnest($3::text[]), unnest($4::text[]) ON CONFLICT DO NOTHING',
      [kind, id, links.map(link => link.key), links.map(link => link.title)]);
  }
  if (tags.length) await client.query('INSERT INTO sense_tags (source_kind, source_id, tag) SELECT $1, $2, unnest($3::text[]) ON CONFLICT DO NOTHING', [kind, id, tags]);
}

function canEdit(actor: SenseActor, row: { author_kind: string; author_id: string | null }) {
  return actor.kind === 'owner' || (row.author_kind === actor.kind && row.author_id === actor.id);
}

// Channels

export async function listChannels() {
  const { rows } = await membershipDatabase().query<{ slug: string; posts: string; last_at: Date | null }>(
    `SELECT c.slug, count(p.id) AS posts, max(p.created_at) AS last_at
     FROM sense_channels c LEFT JOIN sense_posts p ON p.channel_id = c.id AND p.deleted_at IS NULL
     GROUP BY c.slug, c.created_at ORDER BY c.slug = 'inbox' DESC, c.slug = 'signals', c.created_at, c.slug`,
  );
  return rows.map(row => ({ slug: row.slug, posts: Number(row.posts), lastAt: row.last_at?.toISOString() ?? null }));
}

export async function createChannel(slug: unknown) {
  const clean = typeof slug === 'string' ? slug.trim().toLowerCase().replace(/^#/, '').replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') : '';
  if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(clean)) throw new MemberError(400, 'Channel names are letters, numbers and dashes.');
  await membershipDatabase().query('INSERT INTO sense_channels (id, slug) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING', [randomUUID(), clean]);
  return clean;
}

async function channelId(client: PoolClient, slug: string) {
  const { rows } = await client.query<{ id: string }>('SELECT id FROM sense_channels WHERE slug = $1', [slug]);
  if (!rows[0]) throw new MemberError(404, 'That channel doesn’t exist.');
  return rows[0].id;
}

// Posts

/** Newest top-level posts in a channel, oldest first within the page. */
export async function listPosts(channel: string, before?: string | null) {
  const { rows } = await membershipDatabase().query<PostRow>(
    `SELECT ${POST_COLUMNS} FROM sense_posts p JOIN sense_channels c ON c.id = p.channel_id
     WHERE c.slug = $1 AND p.parent_id IS NULL AND p.deleted_at IS NULL AND ($2::timestamptz IS NULL OR p.created_at < $2)
     ORDER BY p.created_at DESC LIMIT $3`,
    [channel, before || null, PAGE],
  );
  return { posts: rows.reverse().map(toPost), hasMore: rows.length === PAGE };
}

export async function getThread(id: string) {
  const { rows } = await membershipDatabase().query<PostRow>(
    `SELECT ${POST_COLUMNS} FROM sense_posts p JOIN sense_channels c ON c.id = p.channel_id
     WHERE (p.id = $1 OR p.parent_id = $1) AND p.deleted_at IS NULL ORDER BY p.parent_id NULLS FIRST, p.created_at`,
    [id],
  );
  const root = rows.find(row => row.id === id);
  if (!root) throw new MemberError(404, 'That post is gone.');
  return { root: toPost(root), replies: rows.filter(row => row.id !== id).map(toPost) };
}

export async function createPost(actor: SenseActor, input: { channel?: unknown; parentId?: unknown; body: unknown; signalKind?: string }) {
  const body = cleanBody(input.body, MAX_POST);
  return transaction(async client => {
    let channel: string;
    let parentId: string | null = null;
    if (typeof input.parentId === 'string') {
      const { rows } = await client.query<{ channel_id: string; parent_id: string | null }>(
        'SELECT channel_id, parent_id FROM sense_posts WHERE id = $1 AND deleted_at IS NULL', [input.parentId]);
      if (!rows[0]) throw new MemberError(404, 'That thread is gone.');
      // Replies always attach to the thread's root.
      parentId = rows[0].parent_id ?? input.parentId;
      channel = rows[0].channel_id;
    } else {
      channel = await channelId(client, typeof input.channel === 'string' ? input.channel : 'inbox');
    }
    const id = randomUUID();
    await client.query(
      `INSERT INTO sense_posts (id, channel_id, parent_id, author_kind, author_id, author_label, body, signal_kind)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, channel, parentId, actor.kind, actor.id, actor.label, body, input.signalKind ?? null],
    );
    await reindex(client, 'post', id, body);
    const { rows } = await client.query<PostRow>(`SELECT ${POST_COLUMNS} FROM sense_posts p JOIN sense_channels c ON c.id = p.channel_id WHERE p.id = $1`, [id]);
    return toPost(rows[0]);
  });
}

export async function editPost(actor: SenseActor, id: string, body: unknown) {
  const text = cleanBody(body, MAX_POST);
  return transaction(async client => {
    const { rows } = await client.query('SELECT author_kind, author_id FROM sense_posts WHERE id = $1 AND deleted_at IS NULL FOR UPDATE', [id]);
    if (!rows[0]) throw new MemberError(404, 'That post is gone.');
    if (!canEdit(actor, rows[0])) throw new MemberError(403, 'Only the author can edit this.');
    await client.query('UPDATE sense_posts SET body = $2, edited_at = NOW() WHERE id = $1', [id, text]);
    await reindex(client, 'post', id, text);
    const result = await client.query<PostRow>(`SELECT ${POST_COLUMNS} FROM sense_posts p JOIN sense_channels c ON c.id = p.channel_id WHERE p.id = $1`, [id]);
    return toPost(result.rows[0]);
  });
}

export async function deletePost(actor: SenseActor, id: string) {
  await transaction(async client => {
    const { rows } = await client.query('SELECT author_kind, author_id FROM sense_posts WHERE id = $1 AND deleted_at IS NULL FOR UPDATE', [id]);
    if (!rows[0]) return;
    if (!canEdit(actor, rows[0])) throw new MemberError(403, 'Only the author can delete this.');
    await client.query('UPDATE sense_posts SET deleted_at = NOW() WHERE id = $1', [id]);
    await client.query("DELETE FROM sense_links WHERE source_kind = 'post' AND source_id = $1", [id]);
    await client.query("DELETE FROM sense_tags WHERE source_kind = 'post' AND source_id = $1", [id]);
  });
}

// Notes

/** Written notes, plus "unwritten" titles that are linked but have no note yet. */
export async function listNotes() {
  const db = membershipDatabase();
  const [notes, ghosts] = await Promise.all([
    db.query<{ id: string; title: string; updated_at: Date; backlinks: string }>(
      `SELECT n.id, n.title, n.updated_at, (SELECT count(*) FROM sense_links l WHERE l.target = lower(n.title)) AS backlinks
       FROM sense_notes n ORDER BY n.updated_at DESC`),
    db.query<{ target: string; title: string; backlinks: string }>(
      `SELECT l.target, min(l.title) AS title, count(*) AS backlinks FROM sense_links l
       WHERE NOT EXISTS (SELECT 1 FROM sense_notes n WHERE lower(n.title) = l.target)
       GROUP BY l.target ORDER BY count(*) DESC, l.target LIMIT 200`),
  ]);
  return {
    notes: notes.rows.map(row => ({ id: row.id, title: row.title, updatedAt: row.updated_at.toISOString(), backlinks: Number(row.backlinks) })),
    unwritten: ghosts.rows.map(row => ({ key: row.target, title: row.title, backlinks: Number(row.backlinks) })),
  };
}

export interface Backlink {
  kind: 'post' | 'note';
  id: string;
  /** For posts: the channel. For notes: the title. */
  where: string;
  threadId: string | null;
  excerpt: string;
  createdAt: string;
}

async function backlinks(key: string): Promise<Backlink[]> {
  const { rows } = await membershipDatabase().query<{ kind: 'post' | 'note'; id: string; where_: string; thread_id: string | null; body: string; at: Date }>(
    `SELECT 'post' AS kind, p.id, c.slug AS where_, COALESCE(p.parent_id, p.id) AS thread_id, p.body, p.created_at AS at
       FROM sense_links l JOIN sense_posts p ON l.source_kind = 'post' AND p.id = l.source_id AND p.deleted_at IS NULL
       JOIN sense_channels c ON c.id = p.channel_id WHERE l.target = $1
     UNION ALL
     SELECT 'note', n.id, n.title, NULL, n.body, n.updated_at
       FROM sense_links l JOIN sense_notes n ON l.source_kind = 'note' AND n.id = l.source_id WHERE l.target = $1
     ORDER BY at DESC LIMIT 200`,
    [key],
  );
  return rows.map(row => ({
    kind: row.kind, id: row.id, where: row.where_, threadId: row.thread_id,
    excerpt: excerptAround(row.body, key), createdAt: row.at.toISOString(),
  }));
}

/** A short excerpt, centered on the link when it can be found. */
function excerptAround(body: string, key: string) {
  const flat = body.replace(/\s+/g, ' ');
  const at = flat.toLowerCase().indexOf('[[' + key);
  const start = Math.max(0, (at < 0 ? 0 : at) - 80);
  return (start > 0 ? '…' : '') + flat.slice(start, start + 220) + (flat.length > start + 220 ? '…' : '');
}

/** A note by title (written or not) with everything that links to it. */
export async function getNoteByTitle(title: string) {
  const key = linkKey(title);
  const db = membershipDatabase();
  const { rows } = await db.query('SELECT * FROM sense_notes WHERE lower(title) = $1', [key]);
  // An unwritten note takes the title as it was first written in a link.
  const written = rows[0]?.title ?? (await db.query<{ title: string }>('SELECT min(title) AS title FROM sense_links WHERE target = $1', [key])).rows[0]?.title;
  return { note: rows[0] ? toNote(rows[0]) : null, title: written ?? title.trim(), backlinks: await backlinks(key) };
}

/** Create the note, or update it in place if one already has this title. */
export async function saveNote(actor: SenseActor, input: { id?: unknown; title: unknown; body: unknown }) {
  const title = cleanTitle(input.title);
  const body = typeof input.body === 'string' ? input.body.replace(/\r\n/g, '\n') : '';
  if (body.length > MAX_NOTE) throw new MemberError(413, 'That note is too long.');
  return transaction(async client => {
    const existing = typeof input.id === 'string'
      ? (await client.query('SELECT * FROM sense_notes WHERE id = $1 FOR UPDATE', [input.id])).rows[0]
      : (await client.query('SELECT * FROM sense_notes WHERE lower(title) = $1 FOR UPDATE', [linkKey(title)])).rows[0];
    if (typeof input.id === 'string' && !existing) throw new MemberError(404, 'That note is gone.');
    if (existing && !canEdit(actor, existing)) throw new MemberError(403, 'Only the author can edit this note.');
    const clash = (await client.query('SELECT id FROM sense_notes WHERE lower(title) = $1 AND id <> $2', [linkKey(title), existing?.id ?? '00000000-0000-0000-0000-000000000000'])).rows[0];
    if (clash) throw new MemberError(409, 'Another note already has that title.');
    const id = existing?.id ?? randomUUID();
    if (existing) {
      await client.query('UPDATE sense_notes SET title = $2, body = $3, updated_at = NOW() WHERE id = $1', [id, title, body]);
    } else {
      await client.query(
        'INSERT INTO sense_notes (id, title, body, author_kind, author_id, author_label) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, title, body, actor.kind, actor.id, actor.label]);
    }
    await reindex(client, 'note', id, body);
    return toNote((await client.query('SELECT * FROM sense_notes WHERE id = $1', [id])).rows[0]);
  });
}

async function getPost(id: string) {
  const { rows } = await membershipDatabase().query<PostRow>(
    `SELECT ${POST_COLUMNS} FROM sense_posts p JOIN sense_channels c ON c.id = p.channel_id WHERE p.id = $1 AND p.deleted_at IS NULL`, [id]);
  if (!rows[0]) throw new MemberError(404, 'That post is gone.');
  return toPost(rows[0]);
}

/** Weave a post into a note: append it as a quote that points back to the post. Creates the note if needed. */
export async function weavePost(actor: SenseActor, postId: string, title: unknown) {
  const post = await getPost(postId);
  const { note } = await getNoteByTitle(cleanTitle(title));
  const quote = post.body.split('\n').map(line => '> ' + line).join('\n');
  const woven = `${quote}\n> — [#${post.channel} · ${post.createdAt.slice(0, 10)}](sense:post/${post.parentId ?? post.id})`;
  return saveNote(actor, { id: note?.id, title, body: note?.body ? `${note.body.trimEnd()}\n\n${woven}\n` : `${woven}\n` });
}

// Tags and search

export async function byTag(tag: string) {
  const clean = tag.toLowerCase().replace(/^#/, '');
  const { rows } = await membershipDatabase().query<{ kind: 'post' | 'note'; id: string; where_: string; thread_id: string | null; body: string; at: Date }>(
    `SELECT 'post' AS kind, p.id, c.slug AS where_, COALESCE(p.parent_id, p.id) AS thread_id, p.body, p.created_at AS at
       FROM sense_tags t JOIN sense_posts p ON t.source_kind = 'post' AND p.id = t.source_id AND p.deleted_at IS NULL
       JOIN sense_channels c ON c.id = p.channel_id WHERE t.tag = $1
     UNION ALL
     SELECT 'note', n.id, n.title, NULL, n.body, n.updated_at
       FROM sense_tags t JOIN sense_notes n ON t.source_kind = 'note' AND n.id = t.source_id WHERE t.tag = $1
     ORDER BY at DESC LIMIT 200`,
    [clean],
  );
  return rows.map(row => ({ kind: row.kind, id: row.id, where: row.where_, threadId: row.thread_id, excerpt: excerptAround(row.body, '#' + clean), createdAt: row.at.toISOString() }));
}

export async function listTags() {
  const { rows } = await membershipDatabase().query<{ tag: string; n: string }>(
    'SELECT tag, count(*) AS n FROM sense_tags GROUP BY tag ORDER BY count(*) DESC, tag LIMIT 100');
  return rows.map(row => ({ tag: row.tag, count: Number(row.n) }));
}

export async function search(query: unknown) {
  if (typeof query !== 'string' || !query.trim()) return [];
  const q = query.trim().slice(0, 200);
  const { rows } = await membershipDatabase().query<{ kind: 'post' | 'note'; id: string; where_: string; thread_id: string | null; snippet: string; at: Date }>(
    `WITH q AS (SELECT websearch_to_tsquery('english', $1) AS query)
     SELECT 'post' AS kind, p.id, c.slug AS where_, COALESCE(p.parent_id, p.id) AS thread_id,
            ts_headline('english', p.body, q.query, 'MaxFragments=1, MaxWords=30, MinWords=10, StartSel=«, StopSel=»') AS snippet,
            p.created_at AS at, ts_rank(p.search, q.query) AS rank
       FROM sense_posts p JOIN sense_channels c ON c.id = p.channel_id, q
       WHERE p.deleted_at IS NULL AND p.search @@ q.query
     UNION ALL
     SELECT 'note', n.id, n.title, NULL,
            ts_headline('english', n.body, q.query, 'MaxFragments=1, MaxWords=30, MinWords=10, StartSel=«, StopSel=»'),
            n.updated_at, ts_rank(n.search, q.query) * 1.5
       FROM sense_notes n, q WHERE n.search @@ q.query
     ORDER BY rank DESC, at DESC LIMIT 50`,
    [q],
  );
  return rows.map(row => ({ kind: row.kind, id: row.id, where: row.where_, threadId: row.thread_id, excerpt: row.snippet, createdAt: row.at.toISOString() }));
}
