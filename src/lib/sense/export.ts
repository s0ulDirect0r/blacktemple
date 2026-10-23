import { Readable } from 'node:stream';
import { membershipDatabase } from '@/lib/membership/database';
import { zip } from '@/lib/temple/zip';
import { allImages, loadImage } from './images';

/** A filename Obsidian and every OS accept; [[links]] resolve against it. */
function fileName(name: string) {
  return name.replace(/[\\/:*?"<>|#^\[\]]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 120) || 'untitled';
}

interface ExportPost { id: string; parent_id: string | null; slug: string; author_label: string; body: string; created_at: Date }

/** Point pasted images and post links at files inside the vault. */
function vaultMarkdown(body: string, imageFiles: Map<string, string>, postLogs: Map<string, string>, prefix: string) {
  return body
    .replace(/\/api\/sense\/images\/([0-9a-f-]{36})/g, (match, id: string) => imageFiles.has(id) ? `${prefix}images/${imageFiles.get(id)}` : match)
    .replace(/\[([^\]]*)\]\(sense:post\/([0-9a-f-]{36})\)/g, (match, label: string, id: string) => postLogs.has(id) ? `[[${postLogs.get(id)}|${label}]]` : label)
    .replace(/\[([^\]]*)\]\(sense:(?:note|tag)\/[^)]*\)/g, '$1');
}

/** Dates and times in the reader's own zone, so posts land on the day they were written. */
function clock(timeZone: string) {
  const parts = (date: Date) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map(p => [p.type, p.value]));
  return {
    day: (date: Date) => { const p = parts(date); return `${p.year}-${p.month}-${p.day}`; },
    time: (date: Date) => { const p = parts(date); return `${p.hour}:${p.minute}`; },
  };
}

function validTimeZone(value: string | null) {
  if (!value) return 'UTC';
  try { new Intl.DateTimeFormat('en-US', { timeZone: value }); return value; } catch { return 'UTC'; }
}

/** The whole space as an Obsidian-ready vault: notes/, channels/, images/. */
export async function exportVault(requestedTimeZone: string | null = null): Promise<Response> {
  const { day, time } = clock(validTimeZone(requestedTimeZone));
  const db = membershipDatabase();
  const [notes, posts, images] = await Promise.all([
    db.query<{ title: string; body: string; created_at: Date; updated_at: Date }>('SELECT title, body, created_at, updated_at FROM sense_notes ORDER BY title'),
    db.query<ExportPost>(`SELECT p.id, p.parent_id, c.slug, p.author_label, p.body, p.created_at FROM sense_posts p
      JOIN sense_channels c ON c.id = p.channel_id WHERE p.deleted_at IS NULL ORDER BY p.created_at`),
    allImages(),
  ]);

  const imageFiles = new Map(images.map(image => [image.id, image.storage_key.replace(/^sense\//, '')]));
  // One log file per channel per day, named for the day the thread started.
  const logName = (post: ExportPost) => `${post.slug} ${day(post.created_at)}`;
  const roots = new Map(posts.rows.filter(post => !post.parent_id).map(post => [post.id, post]));
  const postLogs = new Map(posts.rows.map(post => [post.id, logName(roots.get(post.parent_id ?? post.id) ?? post)]));

  const logs = new Map<string, string[]>();
  for (const root of roots.values()) {
    const lines = logs.get(logName(root)) ?? [`# #${root.slug} · ${day(root.created_at)}\n`];
    lines.push(`## ${time(root.created_at)} · ${root.author_label}\n\n${vaultMarkdown(root.body, imageFiles, postLogs, '../')}\n`);
    for (const reply of posts.rows.filter(post => post.parent_id === root.id)) {
      const text = vaultMarkdown(reply.body, imageFiles, postLogs, '../').split('\n').map(line => '> ' + line).join('\n');
      lines.push(`> **${reply.author_label}** · ${day(reply.created_at)} ${time(reply.created_at)}\n${text}\n`);
    }
    logs.set(logName(root), lines);
  }

  async function* entries() {
    const used = new Set<string>();
    for (const note of notes.rows) {
      let name = fileName(note.title);
      for (let n = 2; used.has(name.toLowerCase()); n++) name = `${fileName(note.title)} ${n}`;
      used.add(name.toLowerCase());
      const front = `---\ntitle: ${JSON.stringify(note.title)}\ncreated: ${note.created_at.toISOString()}\nupdated: ${note.updated_at.toISOString()}\n---\n\n`;
      yield { name: `notes/${name}.md`, bytes: Buffer.from(front + vaultMarkdown(note.body, imageFiles, postLogs, '../')) };
    }
    for (const [name, lines] of logs) yield { name: `channels/${fileName(name)}.md`, bytes: Buffer.from(lines.join('\n')) };
    for (const image of images) {
      const loaded = await loadImage(image.id);
      if (!loaded) continue;
      const bytes = Buffer.isBuffer(loaded.body) ? loaded.body : Buffer.from(await new Response(loaded.body).arrayBuffer());
      yield { name: `images/${imageFiles.get(image.id)}`, bytes };
    }
  }

  const date = day(new Date());
  return new Response(Readable.toWeb(Readable.from(zip(entries()))) as ReadableStream, {
    headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="black-temple-sense-${date}.zip"`, 'Cache-Control': 'private, no-store' },
  });
}
