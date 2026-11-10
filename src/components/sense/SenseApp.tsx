'use client';

import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import AgentsPane from './AgentsPane';
import Composer from './Composer';
import Markdown, { type SenseTarget } from './Markdown';
import SenseMap from './SenseMap';
import TemplePanel from './TemplePanel';
import { sense, timeLabel, type Backlink, type Found, type SenseNote, type SensePost, type Sidebar } from './api';

type View = { kind: 'channel'; slug: string } | { kind: 'tag'; tag: string } | { kind: 'search'; q: string } | { kind: 'map' };
type Pane = { kind: 'thread'; id: string } | { kind: 'note'; title: string } | { kind: 'agents' } | null;

const AUTHOR_STYLE: Record<string, string> = { owner: 'text-zinc-100', agent: 'text-[#b9f5ff]', member: 'text-emerald-300', system: 'text-amber-300' };

/** Each kind of author has its own mark: Matthew a violet circle, agents a cyan tile, the Temple an amber square. */
const AVATAR_STYLE: Record<string, string> = {
  owner: 'rounded-full border-violet-300/50 text-violet-300',
  agent: 'rounded-lg border-[#b9f5ff]/50 text-[#b9f5ff]',
  member: 'rounded-full border-emerald-300/50 text-emerald-300',
  system: 'rounded-sm border-amber-300/50 text-amber-300',
};
const KIND_CHIP: Record<string, string> = { agent: 'Agent', system: 'Signal', member: 'Member' };

function Avatar({ kind, label }: { kind: string; label: string }) {
  return (
    <span aria-hidden="true" className={`grid h-9 w-9 shrink-0 place-items-center border font-pixel text-[10px] ${AVATAR_STYLE[kind] ?? AVATAR_STYLE.owner}`}>
      {label.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}

/** Like Discord: a post continues the one above when the same author wrote again within 7 minutes. */
const GROUP_WINDOW_MS = 7 * 60 * 1000;
function continues(previous: SensePost | undefined, post: SensePost) {
  return Boolean(previous) && post.author.kind !== 'system' && previous!.author.kind === post.author.kind &&
    previous!.author.label === post.author.label &&
    new Date(post.createdAt).getTime() - new Date(previous!.createdAt).getTime() < GROUP_WINDOW_MS;
}

function PostItem({ post, onOpen, onThread, onChanged, titles, existingNotes, compact, grouped }: {
  post: SensePost; onOpen: (t: SenseTarget) => void; onThread?: (id: string) => void; onChanged: () => void;
  titles: string[]; existingNotes: Set<string>; compact?: boolean;
  /** Continues the post above: no name line; time and actions appear on hover. */
  grouped?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [weaving, setWeaving] = useState(false);
  const [weaveTitle, setWeaveTitle] = useState('');
  const [error, setError] = useState('');
  const signal = post.author.kind === 'system';

  const weave = async () => {
    if (!weaveTitle.trim()) return;
    try {
      await sense(`/posts/${post.id}/weave`, { method: 'POST', body: JSON.stringify({ title: weaveTitle }) });
      setWeaving(false);
      onChanged();
      onOpen({ kind: 'note', title: weaveTitle.trim() });
      setWeaveTitle('');
    } catch (e) { setError(e instanceof Error ? e.message : 'That didn’t weave.'); }
  };

  const cancelWeave = () => { setWeaving(false); setWeaveTitle(''); setError(''); };

  const remove = async () => {
    if (!window.confirm('Delete this post?')) return;
    try { await sense(`/posts/${post.id}`, { method: 'DELETE' }); onChanged(); }
    catch (e) { setError(e instanceof Error ? e.message : 'That didn’t delete.'); }
  };

  const actions = (
    <span className="ml-auto hidden gap-3 text-zinc-500 group-hover:flex group-focus-within:flex">
      {onThread && <button type="button" onClick={() => onThread(post.parentId ?? post.id)} className="hover:text-zinc-200">Reply</button>}
      <button type="button" onClick={() => setWeaving(w => !w)} className="hover:text-zinc-200">Weave</button>
      {!signal && <button type="button" onClick={() => setEditing(e => !e)} className="hover:text-zinc-200">Edit</button>}
      <button type="button" onClick={remove} className="hover:text-red-300">Delete</button>
    </span>
  );

  return (
    <article tabIndex={0} className={`group relative flex gap-3 rounded-md px-3 focus:outline-none hover:bg-white/[0.03] ${grouped ? 'py-0.5' : 'mt-3 py-1.5'}`}>
      {grouped || compact ? (compact ? null : <span className="w-9 shrink-0" />) : <Avatar kind={post.author.kind} label={post.author.label} />}
      <div className="min-w-0 flex-1">
      {grouped ? (
        // Name line hidden; time and actions float in on hover.
        <div className="absolute right-3 top-0.5 hidden items-baseline gap-3 rounded bg-zinc-950/90 px-2 text-xs group-hover:flex group-focus-within:flex">
          <time className="text-zinc-500" dateTime={post.createdAt}>{timeLabel(post.createdAt)}</time>
          {post.editedAt && <span className="text-zinc-600">edited</span>}
          {actions}
        </div>
      ) : (
        <header className="flex items-baseline gap-2 text-xs">
          <span className={`text-sm font-medium ${AUTHOR_STYLE[post.author.kind] ?? 'text-zinc-200'}`}>{post.author.label}</span>
          {KIND_CHIP[post.author.kind] && <span className={`rounded-sm border px-1 py-0.5 font-pixel text-[7px] ${post.author.kind === 'system' ? 'border-amber-300/50 text-amber-300' : post.author.kind === 'agent' ? 'border-[#b9f5ff]/50 text-[#b9f5ff]' : 'border-emerald-300/50 text-emerald-300'}`}>{KIND_CHIP[post.author.kind]}</span>}
          <time className="text-zinc-500" dateTime={post.createdAt}>{timeLabel(post.createdAt)}</time>
          {post.editedAt && <span className="text-zinc-600">edited</span>}
          {actions}
        </header>
      )}
      {editing ? (
        <div className="mt-1">
          <Composer mode="editor" initial={post.body} titles={titles} placeholder="Edit post" autoFocus
            onSubmit={async body => { await sense(`/posts/${post.id}`, { method: 'PATCH', body: JSON.stringify({ body }) }); setEditing(false); onChanged(); }} />
        </div>
      ) : (
        <div className="mt-0.5 text-[15px] leading-relaxed text-zinc-200"><Markdown text={post.body} onOpen={onOpen} existingNotes={existingNotes} /></div>
      )}
      {weaving && (
        <form className="mt-2 flex gap-2" onSubmit={e => { e.preventDefault(); weave(); }}
          onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); cancelWeave(); } }}>
          <input autoFocus list="sense-note-titles" value={weaveTitle} onChange={e => setWeaveTitle(e.target.value)} placeholder="Weave into note…"
            aria-label="Note to weave into" className="w-64 rounded border border-white/15 bg-black/40 px-2 py-1 text-sm text-zinc-100" />
          <button type="submit" className="rounded border border-white/20 px-2 text-sm text-zinc-200 hover:bg-white/10">Weave</button>
          <button type="button" onClick={cancelWeave} className="px-1 text-sm text-zinc-500 hover:text-zinc-200">Cancel</button>
        </form>
      )}
      {!compact && post.replyCount > 0 && onThread && (
        <button type="button" onClick={() => onThread(post.id)} className="mt-1 text-xs text-violet-300 hover:text-violet-200">
          {post.replyCount} {post.replyCount === 1 ? 'reply' : 'replies'}
        </button>
      )}
      {error && <p role="alert" className="mt-1 text-xs text-red-300">{error}</p>}
      </div>
    </article>
  );
}

function FoundList({ results, onOpenFound, empty }: { results: Found[] | null; onOpenFound: (f: Found) => void; empty: string }) {
  if (!results) return <p className="px-3 text-sm text-zinc-500">Looking…</p>;
  if (!results.length) return <p className="px-3 text-sm text-zinc-500">{empty}</p>;
  return (
    <ul className="space-y-1">
      {results.map(found => (
        <li key={found.kind + found.id}>
          <button type="button" onClick={() => onOpenFound(found)} className="block w-full rounded-md px-3 py-2 text-left hover:bg-white/[0.04]">
            <span className="text-xs text-zinc-500">{found.kind === 'post' ? `#${found.where}` : found.where} · {timeLabel(found.createdAt)}</span>
            <span className="block text-sm text-zinc-300">{found.excerpt.replace(/[«»]/g, '')}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function NotePane({ title, titles, existingNotes, onOpen, onOpenFound, onChanged }: {
  title: string; titles: string[]; existingNotes: Set<string>; onOpen: (t: SenseTarget) => void; onOpenFound: (f: Found) => void; onChanged: () => void;
}) {
  const [data, setData] = useState<{ note: SenseNote | null; title: string; backlinks: Backlink[] } | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [error, setError] = useState('');

  const load = useCallback(() => sense<{ note: SenseNote | null; title: string; backlinks: Backlink[] }>(`/notes/by-title?title=${encodeURIComponent(title)}`)
    .then(result => {
      setError('');
      setData(result);
      setDraftTitle(result.note?.title ?? result.title);
      setEditing(!result.note);
    })
    .catch(e => setError(e instanceof Error ? e.message : 'Couldn’t load that note.')), [title]);

  // The pane is keyed by title, so each note starts fresh.
  useEffect(() => { load(); }, [load]);

  const save = async (body: string) => {
    const saved = await sense<SenseNote>('/notes', { method: 'POST', body: JSON.stringify({ id: data?.note?.id, title: draftTitle, body }) });
    setEditing(false);
    onChanged();
    if (saved.title.toLowerCase() !== title.toLowerCase()) onOpen({ kind: 'note', title: saved.title });
    else load();
  };

  if (error) return <p className="p-4 text-sm text-red-300">{error}</p>;
  if (!data) return <p className="p-4 text-sm text-zinc-500">Opening…</p>;
  return (
    <div className="space-y-4 p-4">
      <div>
        <p className="sense-eyebrow">{data.note ? 'Note' : 'Unwritten note'}</p>
        {editing
          ? <input value={draftTitle} onChange={e => setDraftTitle(e.target.value)} className="mt-1 w-full rounded border border-white/15 bg-black/40 px-2 py-1 text-lg font-semibold text-white" aria-label="Note title" />
          : <h2 className="mt-2 text-xl font-medium text-white">{data.note?.title ?? data.title}</h2>}
        <p className="mt-1 text-xs text-zinc-500">{data.note ? `Updated ${timeLabel(data.note.updatedAt)} · ${data.backlinks.length} backlinks` : 'Linked but not yet written'}</p>
        <div className="sense-rule mt-3" />
      </div>
      {editing ? (
        <Composer mode="editor" initial={data.note?.body ?? ''} titles={titles} minRows={8} autoFocus placeholder="Write the note…" onSubmit={save} />
      ) : (
        <div>
          <div className="text-[15px] leading-relaxed text-zinc-200"><Markdown text={data.note?.body ?? ''} onOpen={onOpen} existingNotes={existingNotes} /></div>
          <button type="button" onClick={() => setEditing(true)} className="mt-3 rounded border border-white/20 px-3 py-1 text-sm text-zinc-200 hover:bg-white/10">Edit</button>
        </div>
      )}
      <section>
        <h3 className="sense-eyebrow mb-2">Backlinks · {data.backlinks.length}</h3>
        <FoundList results={data.backlinks} onOpenFound={onOpenFound} empty="Nothing links here yet. Write [[" />
      </section>
    </div>
  );
}

function ThreadPane({ id, titles, existingNotes, onOpen, onChanged }: { id: string; titles: string[]; existingNotes: Set<string>; onOpen: (t: SenseTarget) => void; onChanged: () => void }) {
  const [thread, setThread] = useState<{ root: SensePost; replies: SensePost[] } | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => sense<{ root: SensePost; replies: SensePost[] }>(`/posts/${id}`)
    .then(result => { setThread(result); setError(''); })
    .catch(e => setError(e instanceof Error ? e.message : 'Couldn’t load that thread.')), [id]);
  useEffect(() => { load(); }, [load]);
  const changed = () => { load(); onChanged(); };

  if (error) return <p className="p-4 text-sm text-red-300">{error}</p>;
  if (!thread) return <p className="p-4 text-sm text-zinc-500">Opening…</p>;
  return (
    <div className="flex h-full flex-col">
      <p className="sense-eyebrow px-4 pt-4">Thread · #{thread.root.channel}</p>
      <div className="sense-scroll flex-1 space-y-1 overflow-y-auto p-2">
        <PostItem post={thread.root} onOpen={onOpen} onChanged={changed} titles={titles} existingNotes={existingNotes} compact />
        <div className="ml-3 border-l border-white/10 pl-2">
          {thread.replies.map((reply, i) => <PostItem key={reply.id} post={reply} grouped={continues(thread.replies[i - 1], reply)} onOpen={onOpen} onChanged={changed} titles={titles} existingNotes={existingNotes} compact />)}
        </div>
      </div>
      <div className="border-t border-white/10 p-3">
        <Composer titles={titles} placeholder="Reply…" onSubmit={async body => { await sense('/posts', { method: 'POST', body: JSON.stringify({ parentId: thread.root.id, body }) }); changed(); }} />
      </div>
    </div>
  );
}

export default function SenseApp() {
  const [sidebar, setSidebar] = useState<Sidebar | null>(null);
  const [view, setView] = useState<View>({ kind: 'channel', slug: 'inbox' });
  const [pane, setPane] = useState<Pane>(null);
  // Feed and results remember which view they belong to, so switching views shows "Loading" without resetting state.
  const [feed, setFeed] = useState<{ key: string; posts: SensePost[]; hasMore: boolean } | null>(null);
  const [results, setResults] = useState<{ key: string; found: Found[] } | null>(null);
  const [query, setQuery] = useState('');
  const [newChannel, setNewChannel] = useState<string | null>(null);
  // Phones and tablets: the sidebar slides over the feed, and panes open full screen.
  const [drawer, setDrawer] = useState(false);
  const [error, setError] = useState('');
  // Like Discord: stay pinned to the newest post unless you've scrolled up to read.
  const feedScroll = useRef<HTMLDivElement>(null);
  const feedContent = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const scrollToLatest = useCallback((smooth = false) => {
    const el = feedScroll.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, []);
  const onFeedScroll = () => {
    const el = feedScroll.current;
    if (!el) return;
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    atBottom.current = fromBottom < 80;
    setShowJump(fromBottom > 400);
  };
  // Images and edits change the feed's height after render; keep the newest post in view if you were there.
  const mapOpen = view.kind === 'map';
  useEffect(() => {
    const content = feedContent.current;
    if (!content) return;
    const observer = new ResizeObserver(() => { if (atBottom.current) scrollToLatest(); });
    observer.observe(content);
    return () => observer.disconnect();
    // The feed is unmounted while the map is open, so watch the new one when it comes back.
  }, [scrollToLatest, mapOpen]);

  // Written and unwritten titles for [[ autocomplete, once each regardless of case.
  const titles = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const title of [...(sidebar?.notes.map(n => n.title) ?? []), ...(sidebar?.unwritten.map(u => u.title) ?? [])]) {
      if (!byKey.has(title.toLowerCase())) byKey.set(title.toLowerCase(), title);
    }
    return [...byKey.values()];
  }, [sidebar]);
  const existingNotes = useMemo(() => new Set(sidebar?.notes.map(n => n.title.toLowerCase()) ?? []), [sidebar]);

  const loadSidebar = useCallback(async () => {
    try { setSidebar(await sense<Sidebar>('/channels')); } catch (e) { setError(e instanceof Error ? e.message : 'Couldn’t load Sense.'); }
  }, []);

  const viewKey = JSON.stringify(view);
  const posts = feed?.key === viewKey ? feed.posts : null;
  const hasMore = feed?.key === viewKey && feed.hasMore;
  const found = results?.key === viewKey ? results.found : null;

  /** `scroll`: jump to the newest post (opening a channel, posting). Otherwise only follow if already at the bottom. */
  const loadFeed = useCallback((scroll = true) => {
    if (view.kind !== 'channel') return Promise.resolve();
    return sense<{ posts: SensePost[]; hasMore: boolean }>(`/posts?channel=${view.slug}`).then(result => {
      setFeed({ key: JSON.stringify(view), ...result });
      if (scroll) atBottom.current = true;
    });
  }, [view]);

  // Once new posts are in the page, follow them to the bottom if you were there (or just posted).
  useLayoutEffect(() => {
    if (posts && atBottom.current) scrollToLatest();
  }, [posts, scrollToLatest]);

  /** Show the post straight away, then swap in the saved one (or take it back out if saving fails). */
  const sendPost = async (channel: string, body: string) => {
    const key = JSON.stringify({ kind: 'channel', slug: channel });
    const pendingId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const now = new Date().toISOString();
    const pending: SensePost = { id: pendingId, channel, parentId: null, author: { kind: 'owner', label: 'Matthew' }, body, signalKind: null, replyCount: 0, createdAt: now, editedAt: null };
    const swap = (fn: (posts: SensePost[]) => SensePost[]) => setFeed(f => (f && f.key === key ? { ...f, posts: fn(f.posts) } : f));
    atBottom.current = true;
    swap(posts => [...posts, pending]);
    try {
      const saved = await sense<SensePost>('/posts', { method: 'POST', body: JSON.stringify({ channel, body }) });
      // A feed reload while saving can drop the placeholder; add the saved post back if it isn't there.
      swap(posts => posts.some(p => p.id === pendingId) ? posts.map(p => (p.id === pendingId ? saved : p))
        : posts.some(p => p.id === saved.id) ? posts : [...posts, saved]);
      loadSidebar();
    } catch (e) {
      swap(posts => posts.filter(p => p.id !== pendingId));
      throw e;
    }
  };

  const loadOlder = async () => {
    if (view.kind !== 'channel' || !posts?.length) return;
    const result = await sense<{ posts: SensePost[]; hasMore: boolean }>(`/posts?channel=${view.slug}&before=${encodeURIComponent(posts[0].createdAt)}`);
    // Keep the post you were reading in place while older ones load above it.
    const el = feedScroll.current;
    const fromBottom = el ? el.scrollHeight - el.scrollTop : 0;
    setFeed({ key: viewKey, posts: [...result.posts, ...posts], hasMore: result.hasMore });
    requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight - fromBottom; });
  };

  useEffect(() => {
    sense<Sidebar>('/channels').then(setSidebar).catch(e => setError(e.message));
  }, []);

  useEffect(() => {
    const key = JSON.stringify(view);
    const fail = (e: Error) => setError(e.message);
    if (view.kind === 'channel') loadFeed().catch(fail);
    if (view.kind === 'tag') sense<{ results: Found[] }>(`/tags/${encodeURIComponent(view.tag)}`).then(r => setResults({ key, found: r.results })).catch(fail);
    if (view.kind === 'search') sense<{ results: Found[] }>(`/search?q=${encodeURIComponent(view.q)}`).then(r => setResults({ key, found: r.results })).catch(fail);
  }, [view, loadFeed]);

  // Signals arrive on their own; catch up whenever the tab comes back into focus.
  useEffect(() => {
    const onFocus = () => { loadSidebar(); loadFeed(false).catch(() => {}); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadSidebar, loadFeed]);

  const refresh = () => { loadSidebar(); loadFeed(false).catch(() => {}); };

  const open = useCallback((target: SenseTarget) => {
    if (target.kind === 'note') setPane({ kind: 'note', title: target.title });
    else if (target.kind === 'tag') setView({ kind: 'tag', tag: target.tag });
    else setPane({ kind: 'thread', id: target.id });
  }, []);

  const openFound = (f: Found) => f.kind === 'note' ? setPane({ kind: 'note', title: f.where }) : setPane({ kind: 'thread', id: f.threadId ?? f.id });

  const exportVault = async () => {
    const response = await fetch(`/api/sense/export?tz=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`, { headers: { Authorization: `Bearer ${sessionStorage.getItem('adminSession')}` } });
    if (!response.ok) { setError('Export failed.'); return; }
    const url = URL.createObjectURL(await response.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = `black-temple-sense-${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const createChannel = async () => {
    if (!newChannel?.trim()) { setNewChannel(null); return; }
    try {
      const { slug } = await sense<{ slug: string }>('/channels', { method: 'POST', body: JSON.stringify({ slug: newChannel }) });
      setNewChannel(null);
      await loadSidebar();
      setView({ kind: 'channel', slug });
    } catch (e) { setError(e instanceof Error ? e.message : 'Couldn’t create that channel.'); }
  };

  const heading = view.kind === 'channel' ? `#${view.slug}` : view.kind === 'tag' ? `#${view.tag}` : view.kind === 'map' ? 'The constellation' : view.q;
  const eyebrow = view.kind === 'channel' ? 'Channel' : view.kind === 'tag' ? 'Tagged' : view.kind === 'map' ? 'Map' : 'Search';
  // Leaving the map returns to the channel you were last in.
  const lastChannel = useRef('inbox');
  useEffect(() => { if (view.kind === 'channel') lastChannel.current = view.slug; }, [view]);

  return (
    <div className="sense-world grid h-[100dvh] grid-cols-1 text-zinc-100 lg:grid-cols-[232px_minmax(0,1fr)_minmax(0,380px)]">
      {drawer && <button type="button" aria-label="Close menu" onClick={() => setDrawer(false)} className="fixed inset-0 z-30 bg-black/60 lg:hidden" />}
      <datalist id="sense-note-titles">{titles.map(t => <option key={t} value={t} />)}</datalist>

      <nav className={`${drawer ? 'fixed inset-y-0 left-0 z-40 flex w-72' : 'hidden'} min-h-0 flex-col border-r border-white/10 bg-zinc-950 lg:static lg:flex lg:w-auto lg:bg-black/60`} aria-label="Sense">
        <div className="border-b border-white/10 p-4">
          <Link href="/admin" className="text-xs text-zinc-500 hover:text-zinc-300">← Admin</Link>
          <p className="mt-3 font-pixel text-xs text-white">Sense</p>
          <p className="mt-1 text-xs text-zinc-500">Your room in the Temple</p>
          <form className="mt-3" onSubmit={e => { e.preventDefault(); if (query.trim()) setView({ kind: 'search', q: query.trim() }); }}>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search…" aria-label="Search posts and notes"
              className="w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm placeholder:text-zinc-500 focus:border-violet-300/60 focus:outline-none" />
          </form>
        </div>
        <div className="sense-scroll flex-1 space-y-6 overflow-y-auto p-3 text-sm" onClick={e => { const button = (e.target as HTMLElement).closest('button'); if (button && !button.dataset.keepOpen) setDrawer(false); }}>
          <section>
            <button type="button" onClick={() => setView({ kind: 'map' })}
              className={`mb-5 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left ${view.kind === 'map' ? 'bg-violet-300/10 text-white shadow-[inset_2px_0_0_#c4b5fd]' : 'text-zinc-300 hover:text-white'}`}>
              <span className="text-violet-300" aria-hidden="true">✦</span> Map
            </button>
            <div className="mb-2 flex items-center justify-between px-2">
              <span className="sense-eyebrow">Channels</span>
              <button type="button" data-keep-open="true" onClick={() => setNewChannel('')} aria-label="New channel" className="text-zinc-500 hover:text-zinc-200">+</button>
            </div>
            {sidebar?.channels.map(channel => (
              <button key={channel.slug} type="button" onClick={() => setView({ kind: 'channel', slug: channel.slug })}
                className={`block w-full truncate rounded px-2 py-1 text-left ${view.kind === 'channel' && view.slug === channel.slug ? 'bg-violet-300/10 text-white shadow-[inset_2px_0_0_#c4b5fd]' : 'text-zinc-400 hover:text-zinc-200'}`}>
                # {channel.slug}
              </button>
            ))}
            {newChannel !== null && (
              <form onSubmit={e => { e.preventDefault(); createChannel(); }}>
                <input autoFocus value={newChannel} onChange={e => setNewChannel(e.target.value)} onBlur={createChannel} placeholder="channel-name"
                  className="mt-1 w-full rounded border border-white/15 bg-black/40 px-2 py-0.5 text-sm" />
              </form>
            )}
          </section>
          <section>
            <div className="mb-2 flex items-center justify-between px-2">
              <span className="sense-eyebrow">Notes</span>
              <button type="button" onClick={() => { const t = window.prompt('Note title'); if (t?.trim()) setPane({ kind: 'note', title: t.trim() }); }} aria-label="New note" className="text-zinc-500 hover:text-zinc-200">+</button>
            </div>
            {sidebar?.notes.map(note => (
              <button key={note.id} type="button" onClick={() => setPane({ kind: 'note', title: note.title })}
                className={`block w-full truncate rounded px-2 py-0.5 text-left ${pane?.kind === 'note' && pane.title.toLowerCase() === note.title.toLowerCase() ? 'bg-violet-300/10 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}>
                <span className="mr-1.5 text-violet-300/70" aria-hidden="true">◇</span>{note.title}{note.backlinks > 0 && <span className="ml-1 text-xs text-zinc-600">{note.backlinks}</span>}
              </button>
            ))}
            {sidebar && sidebar.unwritten.length > 0 && (
              <>
                <p className="mb-1 mt-3 px-2 text-xs text-zinc-600">Unwritten</p>
                {sidebar.unwritten.map(ghost => (
                  <button key={ghost.key} type="button" onClick={() => setPane({ kind: 'note', title: ghost.title })}
                    className="block w-full truncate rounded px-2 py-0.5 text-left text-zinc-500 hover:text-zinc-300">
                    <span className="mr-1.5 text-zinc-600" aria-hidden="true">◌</span>{ghost.title}<span className="ml-1 text-xs text-zinc-600">{ghost.backlinks}</span>
                  </button>
                ))}
              </>
            )}
          </section>
          {sidebar && sidebar.tags.length > 0 && (
            <section>
              <p className="sense-eyebrow mb-2 px-2">Tags</p>
              <div className="flex flex-wrap gap-1">
                {sidebar.tags.map(t => (
                  <button key={t.tag} type="button" onClick={() => setView({ kind: 'tag', tag: t.tag })} className="rounded-sm border border-[#b9f5ff]/20 px-1.5 py-0.5 text-xs text-[#b9f5ff]/80 hover:border-[#b9f5ff]/50 hover:text-[#b9f5ff]">#{t.tag}</button>
                ))}
              </div>
            </section>
          )}
        </div>
        <div className="space-y-1 border-t border-white/10 p-3">
          <button type="button" onClick={() => { setPane({ kind: 'agents' }); setDrawer(false); }} className="block text-xs text-zinc-500 hover:text-zinc-300">Agents and MCP</button>
          <button type="button" onClick={exportVault} className="block text-xs text-zinc-500 hover:text-zinc-300">Export as markdown (.zip)</button>
        </div>
      </nav>

      <main className="flex min-h-0 flex-col">
        <header className="border-b border-white/10 px-5 pb-4 pt-4 pr-28">
          <div className="flex items-end gap-3">
            <button type="button" onClick={() => setDrawer(true)} aria-label="Open channels and notes" className="-ml-1 rounded px-1 text-lg leading-none text-zinc-400 hover:text-white lg:hidden">☰</button>
            <div className="min-w-0">
              <p className="sense-eyebrow">{eyebrow}</p>
              <h1 className="mt-1.5 truncate font-pixel text-base text-white">{heading}</h1>
              <div className="sense-rule mt-3" />
            </div>
            <nav className="ml-auto hidden gap-1.5 sm:flex" aria-label="View">
              {(['Feed', 'Map'] as const).map(name => {
                const on = name === 'Map' ? view.kind === 'map' : view.kind !== 'map';
                return (
                  <button key={name} type="button" aria-pressed={on} onClick={() => setView(name === 'Map' ? { kind: 'map' } : { kind: 'channel', slug: lastChannel.current })}
                    className={`border px-2.5 py-1.5 font-pixel text-[8px] ${on ? 'border-violet-300 bg-violet-300 text-black' : 'border-white/20 text-zinc-400 hover:text-white'}`}>{name}</button>
                );
              })}
            </nav>
          </div>
          {error && <p role="alert" className="mt-1 text-xs text-red-300">{error} <button type="button" onClick={() => setError('')} className="underline">Dismiss</button></p>}
        </header>
        <div className="relative min-h-0 flex-1">
        {view.kind === 'map' ? (
          <SenseMap refreshKey={sidebar} onOpenNote={title => setPane({ kind: 'note', title })} onOpenTag={tag => setView({ kind: 'tag', tag })} />
        ) : (
        <div ref={feedScroll} onScroll={onFeedScroll} className="sense-scroll h-full overflow-y-auto px-2 py-3">
          <div ref={feedContent}>
          {view.kind === 'channel' ? (
            posts === null ? <p className="px-3 text-sm text-zinc-500">Loading…</p> : (
              <>
                {hasMore && <button type="button" onClick={loadOlder} className="mb-2 px-3 text-xs text-zinc-500 hover:text-zinc-300">Load earlier posts</button>}
                {posts.length === 0 && <p className="px-3 text-sm text-zinc-500">Start the channel. Post a thought, link a [[note]], paste an image.</p>}
                {posts.map((post, i) => {
                  const item = <PostItem key={post.id} post={post} grouped={continues(posts[i - 1], post)} onOpen={open} onThread={id => setPane({ kind: 'thread', id })} onChanged={refresh} titles={titles} existingNotes={existingNotes} />;
                  // Not saved yet: faded, and no edit or thread actions until it has a real id.
                  return post.id.startsWith('pending-') ? <div key={post.id} className="pointer-events-none opacity-60" aria-busy="true">{item}</div> : item;
                })}
              </>
            )
          ) : (
            <FoundList results={found} onOpenFound={openFound} empty={view.kind === 'tag' ? 'Nothing tagged yet.' : 'Nothing matches.'} />
          )}
          </div>
        </div>
        )}
        {view.kind === 'channel' && showJump && (
          <button type="button" onClick={() => scrollToLatest(true)}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-zinc-900/95 px-4 py-1.5 text-xs text-zinc-200 shadow-lg hover:bg-zinc-800">
            Jump to latest ↓
          </button>
        )}
        </div>
        {view.kind === 'channel' && (
          <div className="border-t border-white/10 px-4 py-3">
            <Composer key={view.slug} autoFocus titles={titles} placeholder={`Post in #${view.slug}`}
              onSubmit={body => sendPost(view.slug, body)} />
          </div>
        )}
      </main>

      <aside className={`${pane ? 'fixed inset-0 z-20 block' : 'hidden'} sense-scroll min-h-0 overflow-y-auto border-l border-white/10 bg-zinc-950 pt-16 lg:static lg:block lg:bg-black/60`}>
        {pane && (
          <div className="flex px-3 lg:justify-end">
            <button type="button" onClick={() => setPane(null)} aria-label="Close panel" className="text-sm text-zinc-400 hover:text-zinc-200 lg:text-xs lg:text-zinc-500">
              <span className="lg:hidden">← Back</span><span className="hidden lg:inline">Close</span>
            </button>
          </div>
        )}
        {pane?.kind === 'note' && <NotePane key={pane.title.toLowerCase()} title={pane.title} titles={titles} existingNotes={existingNotes} onOpen={open} onOpenFound={openFound} onChanged={refresh} />}
        {pane?.kind === 'agents' && <AgentsPane />}
        {pane?.kind === 'thread' && <ThreadPane key={pane.id} id={pane.id} titles={titles} existingNotes={existingNotes} onOpen={open} onChanged={refresh} />}
        {!pane && <TemplePanel sidebar={sidebar} onOpenNote={title => setPane({ kind: 'note', title })} onOpenAgents={() => setPane({ kind: 'agents' })} />}
      </aside>
    </div>
  );
}
