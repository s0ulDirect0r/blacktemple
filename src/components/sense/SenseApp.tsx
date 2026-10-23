'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Composer from './Composer';
import Markdown, { type SenseTarget } from './Markdown';
import { sense, timeLabel, type Backlink, type Found, type SenseNote, type SensePost, type Sidebar } from './api';

type View = { kind: 'channel'; slug: string } | { kind: 'tag'; tag: string } | { kind: 'search'; q: string };
type Pane = { kind: 'thread'; id: string } | { kind: 'note'; title: string } | null;

const AUTHOR_STYLE: Record<string, string> = { owner: 'text-zinc-200', agent: 'text-sky-300', member: 'text-emerald-300', system: 'text-amber-300' };

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
    <article className={`group relative rounded-md px-3 hover:bg-white/[0.03] ${grouped ? 'py-0.5' : 'mt-2 py-1.5'} ${signal ? 'border-l-2 border-amber-400/50 rounded-l-none' : ''}`}>
      {grouped ? (
        // Name line hidden; time and actions float in on hover.
        <div className="absolute right-3 top-0.5 hidden items-baseline gap-3 rounded bg-zinc-950/90 px-2 text-xs group-hover:flex group-focus-within:flex">
          <time className="text-zinc-500" dateTime={post.createdAt}>{timeLabel(post.createdAt)}</time>
          {post.editedAt && <span className="text-zinc-600">edited</span>}
          {actions}
        </div>
      ) : (
        <header className="flex items-baseline gap-2 text-xs">
          <span className={`font-medium ${AUTHOR_STYLE[post.author.kind] ?? 'text-zinc-200'}`}>{post.author.label}</span>
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
        <form className="mt-2 flex gap-2" onSubmit={e => { e.preventDefault(); weave(); }}>
          <input autoFocus list="sense-note-titles" value={weaveTitle} onChange={e => setWeaveTitle(e.target.value)} placeholder="Weave into note…"
            className="w-64 rounded border border-white/15 bg-black/40 px-2 py-1 text-sm text-zinc-100" />
          <button type="submit" className="rounded border border-white/20 px-2 text-sm text-zinc-200 hover:bg-white/10">Weave</button>
        </form>
      )}
      {!compact && post.replyCount > 0 && onThread && (
        <button type="button" onClick={() => onThread(post.id)} className="mt-1 text-xs text-violet-300 hover:text-violet-200">
          {post.replyCount} {post.replyCount === 1 ? 'reply' : 'replies'}
        </button>
      )}
      {error && <p role="alert" className="mt-1 text-xs text-red-300">{error}</p>}
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
        <p className="text-xs text-zinc-500">{data.note ? `Note · updated ${timeLabel(data.note.updatedAt)}` : 'Unwritten note'}</p>
        {editing
          ? <input value={draftTitle} onChange={e => setDraftTitle(e.target.value)} className="mt-1 w-full rounded border border-white/15 bg-black/40 px-2 py-1 text-lg font-semibold text-white" aria-label="Note title" />
          : <h2 className="mt-1 text-lg font-semibold text-white">{data.note?.title ?? data.title}</h2>}
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
        <h3 className="mb-1 text-xs text-zinc-500">Linked from · {data.backlinks.length}</h3>
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
      <p className="px-4 pt-4 text-xs text-zinc-500">Thread in #{thread.root.channel}</p>
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
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
  const [error, setError] = useState('');
  const feedEnd = useRef<HTMLDivElement>(null);

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

  const loadFeed = useCallback((scroll = true) => {
    if (view.kind !== 'channel') return Promise.resolve();
    return sense<{ posts: SensePost[]; hasMore: boolean }>(`/posts?channel=${view.slug}`).then(result => {
      setFeed({ key: JSON.stringify(view), ...result });
      if (scroll) requestAnimationFrame(() => feedEnd.current?.scrollIntoView());
    });
  }, [view]);

  const loadOlder = async () => {
    if (view.kind !== 'channel' || !posts?.length) return;
    const result = await sense<{ posts: SensePost[]; hasMore: boolean }>(`/posts?channel=${view.slug}&before=${encodeURIComponent(posts[0].createdAt)}`);
    setFeed({ key: viewKey, posts: [...result.posts, ...posts], hasMore: result.hasMore });
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

  const heading = view.kind === 'channel' ? `#${view.slug}` : view.kind === 'tag' ? `Tagged #${view.tag}` : `Search: ${view.q}`;

  return (
    <div className="grid h-screen grid-cols-[220px_minmax(0,1fr)_minmax(0,400px)] bg-black text-zinc-100">
      <datalist id="sense-note-titles">{titles.map(t => <option key={t} value={t} />)}</datalist>

      <nav className="flex min-h-0 flex-col border-r border-white/10 bg-zinc-950" aria-label="Sense">
        <div className="border-b border-white/10 p-3">
          <Link href="/admin" className="text-xs text-zinc-500 hover:text-zinc-300">← Admin</Link>
          <p className="mt-1 text-sm font-semibold tracking-wide text-white">Sense</p>
          <form className="mt-2" onSubmit={e => { e.preventDefault(); if (query.trim()) setView({ kind: 'search', q: query.trim() }); }}>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search…" aria-label="Search posts and notes"
              className="w-full rounded border border-white/15 bg-black/40 px-2 py-1 text-sm" />
          </form>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-3 text-sm">
          <section>
            <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
              <span>Channels</span>
              <button type="button" onClick={() => setNewChannel('')} aria-label="New channel" className="hover:text-zinc-200">+</button>
            </div>
            {sidebar?.channels.map(channel => (
              <button key={channel.slug} type="button" onClick={() => setView({ kind: 'channel', slug: channel.slug })}
                className={`block w-full truncate rounded px-2 py-0.5 text-left ${view.kind === 'channel' && view.slug === channel.slug ? 'bg-violet-500/20 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}>
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
            <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
              <span>Notes</span>
              <button type="button" onClick={() => { const t = window.prompt('Note title'); if (t?.trim()) setPane({ kind: 'note', title: t.trim() }); }} aria-label="New note" className="hover:text-zinc-200">+</button>
            </div>
            {sidebar?.notes.map(note => (
              <button key={note.id} type="button" onClick={() => setPane({ kind: 'note', title: note.title })}
                className={`block w-full truncate rounded px-2 py-0.5 text-left ${pane?.kind === 'note' && pane.title.toLowerCase() === note.title.toLowerCase() ? 'bg-violet-500/20 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}>
                {note.title}{note.backlinks > 0 && <span className="ml-1 text-xs text-zinc-600">{note.backlinks}</span>}
              </button>
            ))}
            {sidebar && sidebar.unwritten.length > 0 && (
              <>
                <p className="mb-1 mt-3 text-xs text-zinc-600">Unwritten</p>
                {sidebar.unwritten.map(ghost => (
                  <button key={ghost.key} type="button" onClick={() => setPane({ kind: 'note', title: ghost.title })}
                    className="block w-full truncate rounded px-2 py-0.5 text-left text-zinc-500 hover:text-zinc-300">
                    {ghost.title}<span className="ml-1 text-xs text-zinc-600">{ghost.backlinks}</span>
                  </button>
                ))}
              </>
            )}
          </section>
          {sidebar && sidebar.tags.length > 0 && (
            <section>
              <p className="mb-1 text-xs text-zinc-500">Tags</p>
              <div className="flex flex-wrap gap-1">
                {sidebar.tags.map(t => (
                  <button key={t.tag} type="button" onClick={() => setView({ kind: 'tag', tag: t.tag })} className="rounded bg-white/5 px-1.5 py-0.5 text-xs text-zinc-400 hover:text-zinc-200">#{t.tag}</button>
                ))}
              </div>
            </section>
          )}
        </div>
        <div className="border-t border-white/10 p-3">
          <button type="button" onClick={exportVault} className="text-xs text-zinc-500 hover:text-zinc-300">Export as markdown (.zip)</button>
        </div>
      </nav>

      <main className="flex min-h-0 flex-col">
        <header className="border-b border-white/10 px-4 py-3 pr-28">
          <h1 className="text-sm font-semibold text-white">{heading}</h1>
          {error && <p role="alert" className="mt-1 text-xs text-red-300">{error} <button type="button" onClick={() => setError('')} className="underline">Dismiss</button></p>}
        </header>
        <div className="flex-1 overflow-y-auto px-2 py-3">
          {view.kind === 'channel' ? (
            posts === null ? <p className="px-3 text-sm text-zinc-500">Loading…</p> : (
              <>
                {hasMore && <button type="button" onClick={loadOlder} className="mb-2 px-3 text-xs text-zinc-500 hover:text-zinc-300">Load earlier posts</button>}
                {posts.length === 0 && <p className="px-3 text-sm text-zinc-500">Start the channel. Post a thought, link a [[note]], paste an image.</p>}
                {posts.map((post, i) => <PostItem key={post.id} post={post} grouped={continues(posts[i - 1], post)} onOpen={open} onThread={id => setPane({ kind: 'thread', id })} onChanged={refresh} titles={titles} existingNotes={existingNotes} />)}
                <div ref={feedEnd} />
              </>
            )
          ) : (
            <FoundList results={found} onOpenFound={openFound} empty={view.kind === 'tag' ? 'Nothing tagged yet.' : 'Nothing matches.'} />
          )}
        </div>
        {view.kind === 'channel' && (
          <div className="border-t border-white/10 p-3">
            <Composer key={view.slug} autoFocus titles={titles} placeholder={`Post in #${view.slug}`}
              onSubmit={async body => { await sense('/posts', { method: 'POST', body: JSON.stringify({ channel: view.slug, body }) }); await loadFeed(); loadSidebar(); }} />
          </div>
        )}
      </main>

      <aside className="min-h-0 overflow-y-auto border-l border-white/10 bg-zinc-950 pt-16">
        {pane && (
          <div className="flex justify-end px-3">
            <button type="button" onClick={() => setPane(null)} aria-label="Close panel" className="text-xs text-zinc-500 hover:text-zinc-300">Close</button>
          </div>
        )}
        {pane?.kind === 'note' && <NotePane key={pane.title.toLowerCase()} title={pane.title} titles={titles} existingNotes={existingNotes} onOpen={open} onOpenFound={openFound} onChanged={refresh} />}
        {pane?.kind === 'thread' && <ThreadPane key={pane.id} id={pane.id} titles={titles} existingNotes={existingNotes} onOpen={open} onChanged={refresh} />}
        {!pane && <p className="p-4 text-sm text-zinc-500">Open a [[note]] or a thread to see it here.</p>}
      </aside>
    </div>
  );
}
