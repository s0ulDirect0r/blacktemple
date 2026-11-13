'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { caretFromRendered, continuation, fromBlocks, heading, toBlocks, wordCount } from '@/lib/sense/blocks';
import { sense, uploadImage, type SenseNote } from './api';
import Markdown, { type SenseTarget } from './Markdown';

interface Block { id: number; text: string }
type Status = 'saved' | 'unsaved' | 'saving' | 'conflict' | 'error';

const LINK_QUERY = /\[\[([^\[\]|\n]{0,80})$/;
let nextId = 1;
const makeBlocks = (body: string): Block[] => toBlocks(body).map(text => ({ id: nextId++, text }));

/** One block being written: raw markdown, the [[ picker, pasted images and the keys that move between blocks. */
function ActiveBlock({ text, caret, titles, onChange, onKey, onImageError }: {
  text: string; caret: number; titles: string[];
  onChange: (text: string) => void;
  onKey: (event: React.KeyboardEvent<HTMLTextAreaElement>, el: HTMLTextAreaElement) => void;
  onImageError: (message: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [cursor, setCursor] = useState(caret);
  const [choice, setChoice] = useState(0);
  const [dismissedAt, setDismissedAt] = useState<string | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(caret, caret);
  }, [caret]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  const query = LINK_QUERY.exec(text.slice(0, cursor))?.[1] ?? null;
  const suggestions = useMemo(() => {
    if (query === null || dismissedAt === text.slice(0, cursor)) return [];
    const q = query.trim().toLowerCase();
    const matches = titles.filter(title => title.toLowerCase().includes(q)).slice(0, 6);
    if (q && !titles.some(title => title.toLowerCase() === q)) matches.push(query.trim());
    return matches;
  }, [query, titles, dismissedAt, text, cursor]);

  const place = (value: string, at: number) => {
    onChange(value);
    requestAnimationFrame(() => { ref.current?.setSelectionRange(at, at); setCursor(at); });
  };
  const complete = (title: string) => {
    const before = text.slice(0, cursor).replace(LINK_QUERY, `[[${title}]]`);
    place(before + text.slice(cursor).replace(/^\]\]/, ''), before.length);
  };
  const wrap = (mark: string) => {
    const el = ref.current!;
    const [start, end] = [el.selectionStart, el.selectionEnd];
    place(text.slice(0, start) + mark + text.slice(start, end) + mark + text.slice(end), end + mark.length * (start === end ? 1 : 2));
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length) {
      if (event.key === 'ArrowDown') { event.preventDefault(); setChoice(c => (c + 1) % suggestions.length); return; }
      if (event.key === 'ArrowUp') { event.preventDefault(); setChoice(c => (c - 1 + suggestions.length) % suggestions.length); return; }
      if (event.key === 'Enter' || event.key === 'Tab') { event.preventDefault(); complete(suggestions[Math.min(choice, suggestions.length - 1)]); return; }
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setDismissedAt(text.slice(0, cursor)); return; }
    }
    if ((event.metaKey || event.ctrlKey) && (event.key === 'b' || event.key === 'i')) { event.preventDefault(); wrap(event.key === 'b' ? '**' : '*'); return; }
    onKey(event, event.currentTarget);
  };

  const onPaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const images = [...event.clipboardData.files].filter(file => file.type.startsWith('image/'));
    if (!images.length) return;
    event.preventDefault();
    for (const file of images) {
      try {
        const { url } = await uploadImage(file);
        const el = ref.current;
        const at = el?.selectionStart ?? text.length;
        const current = el?.value ?? text;
        const snippet = `![${file.name && file.name !== 'image.png' ? file.name.replace(/[\[\]]/g, '') : 'image'}](${url})`;
        place(current.slice(0, at) + snippet + current.slice(at), at + snippet.length);
      } catch (e) {
        onImageError(e instanceof Error ? e.message : 'The image didn’t upload.');
      }
    }
  };

  return (
    <div className="relative">
      <textarea ref={ref} value={text} rows={1} spellCheck aria-label="Paragraph" placeholder="Write…"
        onChange={e => { onChange(e.target.value); setCursor(e.target.selectionStart); setChoice(0); }}
        onSelect={e => setCursor(e.currentTarget.selectionStart)}
        onKeyDown={onKeyDown} onPaste={onPaste}
        className="block w-full resize-none overflow-hidden bg-transparent p-0 text-inherit outline-none placeholder:text-zinc-600" />
      {suggestions.length > 0 && (
        <ul role="listbox" className="absolute left-0 top-full z-10 mt-1 w-72 rounded-lg border border-white/15 bg-zinc-950 p-1 font-sans text-sm shadow-2xl">
          {suggestions.map((title, i) => (
            <li key={title} role="option" aria-selected={i === choice}>
              <button type="button" onMouseDown={e => { e.preventDefault(); complete(title); }}
                className={`flex w-full justify-between rounded px-2 py-1.5 text-left ${i === choice ? 'bg-violet-300/15 text-white' : 'text-zinc-300'}`}>
                <span className="truncate">{title}</span>
                {!titles.includes(title) && <span className="text-xs text-zinc-500">new</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * A note opened full screen for longer writing. Paragraphs show formatted until you click into one;
 * the bar fades while you type; it saves itself a moment after you stop.
 */
export default function WritingRoom({ title: startTitle, titles, existingNotes, onClose, onOpenElsewhere }: {
  title: string; titles: string[]; existingNotes: Set<string>;
  /** `title` is where you ended up (after renames or following links); `changed` if anything was saved. */
  onClose: (title: string, changed: boolean) => void;
  /** Tags and posts open back in Sense. */
  onOpenElsewhere: (target: SenseTarget) => void;
}) {
  const [current, setCurrent] = useState(startTitle);
  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState(startTitle);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [active, setActive] = useState<{ index: number; caret: number } | null>(null);
  const [status, setStatus] = useState<Status>('saved');
  const [message, setMessage] = useState('');
  const [typing, setTyping] = useState(false);
  const [here, setHere] = useState(-1);
  // Bumped to load the note again (after a conflict, to take the other version).
  const [reload, setReload] = useState(0);

  // The latest values for saving, which runs from timers and key handlers.
  const note = useRef<SenseNote | null>(null);
  const latest = useRef({ title, blocks });
  latest.current = { title, blocks };
  const dirty = useRef(false);
  const saving = useRef<Promise<void> | null>(null);
  const changed = useRef(false);
  const conflict = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scroller = useRef<HTMLDivElement>(null);
  const blockEls = useRef(new Map<number, HTMLDivElement>());

  useEffect(() => {
    let live = true;
    setLoaded(false);
    sense<{ note: SenseNote | null; title: string }>(`/notes/by-title?title=${encodeURIComponent(current)}`).then(result => {
      if (!live) return;
      note.current = result.note;
      dirty.current = false;
      conflict.current = false;
      setTitle(result.note?.title ?? result.title);
      setBlocks(makeBlocks(result.note?.body ?? ''));
      setActive(result.note?.body.trim() ? null : { index: 0, caret: 0 });
      setStatus('saved');
      setMessage('');
      setLoaded(true);
      scroller.current?.scrollTo({ top: 0 });
    }).catch(e => { if (live) { setMessage(e instanceof Error ? e.message : 'Couldn’t open that note.'); setStatus('error'); } });
    return () => { live = false; };
  }, [current, reload]);

  /** Save now if anything changed. `force` overwrites a note that changed elsewhere. */
  const save = useCallback(async (force = false): Promise<void> => {
    clearTimeout(timer.current);
    if (saving.current) { await saving.current; if (!dirty.current) return; }
    if (!dirty.current) return;
    const { title: nextTitle, blocks: nextBlocks } = latest.current;
    const body = fromBlocks(nextBlocks.map(b => b.text));
    if (!nextTitle.trim()) { setStatus('error'); setMessage('Give it a title to save.'); return; }
    if (!note.current && !body) return;
    dirty.current = false;
    setStatus('saving');
    const run = (async () => {
      try {
        const saved = await sense<SenseNote>('/notes', {
          method: 'POST',
          body: JSON.stringify({ id: note.current?.id, title: nextTitle.trim(), body, baseUpdatedAt: force ? undefined : note.current?.updatedAt }),
        });
        note.current = saved;
        changed.current = true;
        conflict.current = false;
        setMessage('');
        setStatus(dirty.current ? 'unsaved' : 'saved');
      } catch (e) {
        dirty.current = true;
        conflict.current = (e as { status?: number }).status === 412;
        setStatus(conflict.current ? 'conflict' : 'error');
        setMessage(e instanceof Error ? e.message : 'That didn’t save.');
      }
    })();
    saving.current = run;
    await run;
    saving.current = null;
  }, []);

  const touch = useCallback(() => {
    dirty.current = true;
    setStatus(s => (s === 'conflict' ? s : 'unsaved'));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { if (!conflict.current) save(); }, 1200);
  }, [save]);

  const close = useCallback(async () => {
    await save();
    if (dirty.current && !window.confirm('This note has changes that didn’t save. Leave anyway?')) return;
    onClose(note.current?.title ?? latest.current.title, changed.current);
  }, [save, onClose]);

  // Esc leaves (once you're out of a paragraph); ⌘S saves now. Warn before closing the window with unsaved text.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); save(); }
      else if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); close(); }
    };
    const onUnload = (e: BeforeUnloadEvent) => { if (dirty.current) e.preventDefault(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', onUnload);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('beforeunload', onUnload); clearTimeout(timer.current); };
  }, [save, close]);

  // The outline follows where you are reading.
  const headings = useMemo(() => blocks.map((b, index) => ({ index, id: b.id, h: heading(b.text) })).filter(x => x.h), [blocks]);
  const onScroll = () => {
    let at = -1;
    for (const { id, index } of headings) {
      const el = blockEls.current.get(id);
      if (el && el.getBoundingClientRect().top < window.innerHeight * 0.35) at = index;
    }
    setHere(at);
  };
  useEffect(onScroll, [headings]);

  const idle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const typed = () => { setTyping(true); clearTimeout(idle.current); idle.current = setTimeout(() => setTyping(false), 1500); };

  const edit = (fn: (blocks: Block[]) => Block[]) => { setBlocks(fn); touch(); };
  const open = (index: number, caret: number) => setActive({ index, caret });

  const onKey = (index: number) => (event: React.KeyboardEvent<HTMLTextAreaElement>, el: HTMLTextAreaElement) => {
    typed();
    const text = el.value;
    const [start, end] = [el.selectionStart, el.selectionEnd];
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setActive(null); return; }
    if (event.key === 'Enter' && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
      if (/^\s*```/.test(text) && !/```\s*$/.test(text.slice(0, start).split('\n').slice(1).join('\n'))) return; // inside code: newline
      event.preventDefault();
      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      const next = continuation(text.slice(lineStart, start));
      if (next && next !== 'end') {
        edit(bs => bs.map((b, i) => (i === index ? { ...b, text: text.slice(0, start) + '\n' + next + text.slice(end) } : b)));
        open(index, start + 1 + next.length);
        return;
      }
      // A new paragraph: split here. An empty list item or quote line ends the list instead of staying in it.
      const head = next === 'end' ? text.slice(0, Math.max(0, lineStart - 1)) : text.slice(0, start);
      const tail = text.slice(end);
      edit(bs => [...bs.slice(0, index), { ...bs[index], text: head }, { id: nextId++, text: tail }, ...bs.slice(index + 1)]);
      open(index + 1, 0);
      return;
    }
    if (event.key === 'Backspace' && start === 0 && end === 0 && index > 0) {
      event.preventDefault();
      const prev = blocks[index - 1].text;
      edit(bs => [...bs.slice(0, index - 1), { ...bs[index - 1], text: prev + text }, ...bs.slice(index + 1)]);
      open(index - 1, prev.length);
      return;
    }
    if (event.key === 'Delete' && start === text.length && end === start && index < blocks.length - 1) {
      event.preventDefault();
      edit(bs => [...bs.slice(0, index), { ...bs[index], text: text + bs[index + 1].text }, ...bs.slice(index + 2)]);
      open(index, text.length);
      return;
    }
    if (event.key === 'ArrowUp' && start === 0 && end === 0 && index > 0) { event.preventDefault(); open(index - 1, blocks[index - 1].text.length); return; }
    if (event.key === 'ArrowDown' && start === text.length && index < blocks.length - 1) { event.preventDefault(); open(index + 1, 0); }
  };

  /** Clicking formatted text opens that block with the caret where you clicked. */
  const clickBlock = (index: number) => (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button, a')) return;
    event.preventDefault();
    const raw = blocks[index].text;
    const container = event.currentTarget;
    let before = '';
    const doc = document as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null };
    const point = doc.caretPositionFromPoint?.(event.clientX, event.clientY);
    const range = document.createRange();
    if (point) { range.setStart(container, 0); range.setEnd(point.offsetNode, point.offset); before = range.toString(); }
    else if (document.caretRangeFromPoint) {
      const r = document.caretRangeFromPoint(event.clientX, event.clientY);
      if (r) { range.setStart(container, 0); range.setEnd(r.startContainer, r.startOffset); before = range.toString(); }
    }
    open(index, before ? caretFromRendered(raw, before, container.textContent?.length ?? 0) : raw.length);
  };

  const follow = async (target: SenseTarget) => {
    if (target.kind !== 'note') { await close(); onOpenElsewhere(target); return; }
    await save();
    if (dirty.current && !window.confirm('This note has changes that didn’t save. Open the other note anyway?')) return;
    setCurrent(target.title);
  };

  const words = useMemo(() => wordCount(blocks.map(b => b.text).join('\n\n')), [blocks]);
  const statusLabel = { saved: 'Saved', unsaved: 'Unsaved', saving: 'Saving…', conflict: 'Not saved', error: 'Not saved' }[status];
  const chromeHidden = typing && status !== 'conflict' && status !== 'error';

  return (
    <div className="sense-world sense-room fixed inset-0 z-40 text-zinc-200" role="dialog" aria-modal="true" aria-label={`Writing ${title}`}
      onMouseMove={() => setTyping(false)} onPointerDown={() => setTyping(false)}>
      <header className={`fixed inset-x-0 top-0 z-10 flex items-center gap-4 bg-gradient-to-b from-black via-black/80 to-transparent px-5 pb-6 pt-3 text-xs text-zinc-500 transition-opacity duration-500 ${chromeHidden ? 'opacity-0' : 'opacity-100'}`}>
        <button type="button" onClick={close} className="truncate hover:text-zinc-300">Sense · Notes · <span className="text-zinc-400">{title || 'Untitled'}</span></button>
        <div className="ml-auto flex shrink-0 items-center gap-4">
          <span className={status === 'conflict' || status === 'error' ? 'text-amber-300' : ''} aria-live="polite">{statusLabel}</span>
          <span className="hidden sm:inline">{words} {words === 1 ? 'word' : 'words'}</span>
          <button type="button" onClick={close} className="rounded-md border border-white/15 px-2.5 py-1 text-zinc-400 hover:bg-white/10 hover:text-zinc-200">
            <span className="hidden sm:inline">Esc · </span>back to Sense
          </button>
        </div>
      </header>

      {headings.length > 1 && (
        <nav aria-label="Outline" className={`fixed left-6 top-1/2 z-10 hidden max-w-[200px] -translate-y-1/2 flex-col gap-2.5 text-xs transition-opacity duration-500 xl:flex ${chromeHidden ? 'opacity-30' : 'opacity-100'}`}>
          {headings.map(({ index, id, h }) => (
            <button key={id} type="button" onClick={() => blockEls.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className={`flex items-center gap-2.5 text-left ${index === here ? 'text-zinc-100' : 'text-zinc-600 hover:text-zinc-400'}`}
              style={{ paddingLeft: (h!.level - 1) * 10 }}>
              <span className={`h-px shrink-0 ${index === here ? 'w-6 bg-[#b9f5ff] shadow-[0_0_6px_#b9f5ff]' : 'w-3.5 bg-current'}`} />
              <span className="truncate">{h!.text}</span>
            </button>
          ))}
        </nav>
      )}

      <div ref={scroller} onScroll={onScroll} className="sense-scroll h-full overflow-y-auto">
        <article className="mx-auto max-w-[680px] px-6 pb-[40vh] pt-24 sm:pt-28">
          {!loaded ? <p className="text-sm text-zinc-500">{message || 'Opening…'}</p> : (
            <>
              <p className="sense-eyebrow">{note.current ? 'Note' : 'New note'}</p>
              <textarea value={title} rows={1} aria-label="Title" placeholder="Title"
                onChange={e => { setTitle(e.target.value.replace(/\n/g, '')); touch(); }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); open(0, 0); } }}
                className="sense-serif mt-3 block w-full resize-none overflow-hidden bg-transparent text-[2.25rem] font-semibold leading-tight text-white outline-none placeholder:text-zinc-700 sm:text-[2.6rem]"
                ref={el => { if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; } }} />
              <div className="sense-rule mb-10 mt-5" />

              {(status === 'conflict' || status === 'error') && message && (
                <div role="alert" className="mb-8 rounded-md border border-amber-300/30 bg-amber-300/5 p-3 font-sans text-sm text-amber-100">
                  {message}
                  {status === 'conflict' && (
                    <span className="mt-2 flex gap-2">
                      <button type="button" onClick={() => save(true)} className="rounded border border-white/20 px-2.5 py-1 hover:bg-white/10">Keep my version</button>
                      <button type="button" onClick={() => { dirty.current = false; setReload(n => n + 1); }}
                        className="rounded border border-white/20 px-2.5 py-1 hover:bg-white/10">Load the latest (drops my changes)</button>
                    </span>
                  )}
                </div>
              )}

              <div className="sense-serif sense-room-text">
                {blocks.map((block, index) => (
                  <div key={block.id} ref={el => { if (el) blockEls.current.set(block.id, el); else blockEls.current.delete(block.id); }}
                    className="sense-room-block scroll-mt-24">
                    {active?.index === index ? (
                      <ActiveBlock text={block.text} caret={active.caret} titles={titles}
                        onChange={text => { setBlocks(bs => bs.map(b => (b.id === block.id ? { ...b, text } : b))); touch(); typed(); }}
                        onKey={onKey(index)} onImageError={m => { setMessage(m); setStatus('error'); }} />
                    ) : (
                      <div onMouseDown={clickBlock(index)} className="cursor-text">
                        {block.text.trim()
                          ? <Markdown text={block.text} onOpen={follow} existingNotes={existingNotes} />
                          : <p className="text-zinc-600">Write…</p>}
                      </div>
                    )}
                  </div>
                ))}
                {/* Click below the last paragraph to keep writing. */}
                <button type="button" aria-label="Keep writing" onClick={() => {
                  const last = blocks.length - 1;
                  if (blocks[last]?.text.trim()) { edit(bs => [...bs, { id: nextId++, text: '' }]); open(last + 1, 0); } else open(Math.max(last, 0), 0);
                }} className="block h-32 w-full cursor-text" />
              </div>
            </>
          )}
        </article>
      </div>
    </div>
  );
}
