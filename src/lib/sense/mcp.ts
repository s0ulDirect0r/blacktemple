import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { SenseActor } from './actor';
import { byTag, createPost, editPost, getNoteByTitle, getThread, listChannels, listNotes, listPosts, listTags, saveNote, search, weavePost } from './store';

const INSTRUCTIONS = `Sense is Matthew's sensemaking space inside Black Temple: channels of posts and threads (like Discord) plus titled notes joined by [[wiki links]] (like Obsidian).

- Posts are markdown. Link a note by writing [[Note title]]; tag with #tag. Links to notes that don't exist yet are fine: they show up as "unwritten" notes.
- #inbox is for anything unsorted. #signals is written by the Temple itself (new members, supporters, ESCALATION feedback).
- Your posts appear under your agent's name. Write the way you'd post in a shared channel: short, specific, linked.
- Weave a post into a note to collect it there as a quote that links back.`;

/** JSON as the tool result text, which every MCP client can read. */
function result(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] };
}

/** An MCP server bound to one actor: every tool call acts as them. */
export function senseMcpServer(actor: SenseActor) {
  const server = new McpServer({ name: 'black-temple-sense', version: '1.0.0' }, { instructions: INSTRUCTIONS });

  server.registerTool('sense_overview', {
    title: 'Overview',
    description: 'Channels, notes (written and unwritten) and tags in Sense. Start here.',
    annotations: { readOnlyHint: true },
  }, async () => {
    const [channels, notes, tags] = await Promise.all([listChannels(), listNotes(), listTags()]);
    return result({ you: actor.label, channels, ...notes, tags });
  });

  server.registerTool('sense_read_channel', {
    title: 'Read a channel',
    description: 'Recent top-level posts in a channel, oldest first. Pass `before` (an ISO time from the oldest post) to page back.',
    inputSchema: { channel: z.string().describe('Channel name without #, e.g. "inbox"'), before: z.string().optional() },
    annotations: { readOnlyHint: true },
  }, async ({ channel, before }) => result(await listPosts(channel.replace(/^#/, ''), before ?? null)));

  server.registerTool('sense_read_thread', {
    title: 'Read a thread',
    description: 'A post and all its replies.',
    inputSchema: { post_id: z.string().uuid() },
    annotations: { readOnlyHint: true },
  }, async ({ post_id }) => result(await getThread(post_id)));

  server.registerTool('sense_post', {
    title: 'Post in a channel',
    description: 'Post markdown to a channel. Use [[Note title]] to link notes and #tags to tag.',
    inputSchema: { channel: z.string().describe('Channel name without #'), body: z.string().min(1).max(20000) },
  }, async ({ channel, body }) => result(await createPost(actor, { channel: channel.replace(/^#/, ''), body })));

  server.registerTool('sense_reply', {
    title: 'Reply in a thread',
    description: 'Reply to a post. Replies always attach to the thread\'s first post.',
    inputSchema: { post_id: z.string().uuid(), body: z.string().min(1).max(20000) },
  }, async ({ post_id, body }) => result(await createPost(actor, { parentId: post_id, body })));

  server.registerTool('sense_edit_post', {
    title: 'Edit your post',
    description: 'Replace the text of a post you wrote.',
    inputSchema: { post_id: z.string().uuid(), body: z.string().min(1).max(20000) },
  }, async ({ post_id, body }) => result(await editPost(actor, post_id, body)));

  server.registerTool('sense_read_note', {
    title: 'Read a note',
    description: 'A note by title (case-insensitive), with everything that links to it. Unwritten notes return note: null plus their backlinks.',
    inputSchema: { title: z.string().min(1).max(200) },
    annotations: { readOnlyHint: true },
  }, async ({ title }) => result(await getNoteByTitle(title)));

  server.registerTool('sense_write_note', {
    title: 'Write a note',
    description: 'Create a note, replace its body, or append to it. You can only change notes you created; Matthew can change any.',
    inputSchema: {
      title: z.string().min(1).max(200),
      body: z.string().max(200000),
      mode: z.enum(['replace', 'append']).default('append').describe('append adds to the end; replace overwrites the whole note'),
    },
  }, async ({ title, body, mode }) => {
    const { note } = await getNoteByTitle(title);
    const next = mode === 'append' && note?.body ? `${note.body.trimEnd()}\n\n${body}` : body;
    return result(await saveNote(actor, { id: note?.id, title: note?.title ?? title, body: next }));
  });

  server.registerTool('sense_weave', {
    title: 'Weave a post into a note',
    description: 'Append a post to a note as a quote that links back to it. Creates the note if needed.',
    inputSchema: { post_id: z.string().uuid(), title: z.string().min(1).max(200) },
  }, async ({ post_id, title }) => result(await weavePost(actor, post_id, title)));

  server.registerTool('sense_search', {
    title: 'Search',
    description: 'Full-text search across posts and notes. Supports quoted phrases and -exclusions.',
    inputSchema: { query: z.string().min(1).max(200) },
    annotations: { readOnlyHint: true },
  }, async ({ query }) => result({ results: await search(query) }));

  server.registerTool('sense_tagged', {
    title: 'Posts and notes with a tag',
    description: 'Everything tagged #tag, newest first.',
    inputSchema: { tag: z.string().min(1).max(40) },
    annotations: { readOnlyHint: true },
  }, async ({ tag }) => result({ results: await byTag(tag) }));

  return server;
}
