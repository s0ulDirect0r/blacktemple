'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { uploadImage } from './api';

interface ComposerProps {
  placeholder: string;
  /** Titles offered after typing [[. */
  titles: string[];
  initial?: string;
  /** 'enter': chat-style (Enter sends). 'editor': Enter is a newline, ⌘S / ⌘Enter saves. */
  mode?: 'enter' | 'editor';
  onSubmit: (text: string) => Promise<void>;
  /** In editor mode, report every change so the parent can track unsaved text. */
  onChange?: (text: string) => void;
  autoFocus?: boolean;
  minRows?: number;
}

const LINK_QUERY = /\[\[([^\[\]|\n]{0,80})$/;

export default function Composer({ placeholder, titles, initial = '', mode = 'enter', onSubmit, onChange, autoFocus, minRows = 1 }: ComposerProps) {
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState('');
  const [cursor, setCursor] = useState(0);
  const [choice, setChoice] = useState(0);
  // Escape hides suggestions until the text before the cursor changes.
  const [dismissedAt, setDismissedAt] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  // The latest text, so several images uploading at once each land instead of overwriting each other.
  const latest = useRef(text);
  useLayoutEffect(() => { latest.current = text; }, [text]);
  // Files are being dragged somewhere over the window: show the box as a drop target.
  const [dragging, setDragging] = useState(false);
  const [over, setOver] = useState(false);

  useEffect(() => { setText(initial); }, [initial]);

  useEffect(() => {
    const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes('Files');
    let depth = 0;
    const enter = (e: DragEvent) => { if (hasFiles(e)) { depth++; setDragging(true); } };
    const leave = (e: DragEvent) => { if (hasFiles(e) && --depth <= 0) { depth = 0; setDragging(false); } };
    // A file dropped beside the box would otherwise open in place of Sense.
    const stop = (e: DragEvent) => { if (hasFiles(e)) e.preventDefault(); };
    const end = (e: DragEvent) => { stop(e); depth = 0; setDragging(false); setOver(false); };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', stop);
    window.addEventListener('drop', end);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', stop);
      window.removeEventListener('drop', end);
    };
  }, []);

  // Grow with the text instead of scrolling inside the box, and re-fit when the width changes.
  const fit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = mode === 'editor' ? 100000 : 320;
    el.style.height = 'auto';
    // The box is border-box sized, so add the border back onto the content height.
    const border = el.offsetHeight - el.clientHeight;
    el.style.height = `${Math.min(el.scrollHeight + border, max)}px`;
    el.style.overflowY = el.scrollHeight + border > max ? 'auto' : 'hidden';
  }, [mode]);
  useLayoutEffect(fit, [text, fit]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let width = el.clientWidth;
    const observer = new ResizeObserver(() => { if (el.clientWidth !== width) { width = el.clientWidth; fit(); } });
    observer.observe(el);
    return () => observer.disconnect();
  }, [fit]);

  const update = (value: string) => { setText(value); onChange?.(value); };

  const query = useMemo(() => LINK_QUERY.exec(text.slice(0, cursor))?.[1] ?? null, [text, cursor]);
  const suggestions = useMemo(() => {
    if (query === null || dismissedAt === text.slice(0, cursor)) return [];
    const q = query.trim().toLowerCase();
    const matches = titles.filter(title => title.toLowerCase().includes(q)).slice(0, 6);
    if (q && !titles.some(title => title.toLowerCase() === q)) matches.push(query.trim());
    return matches;
  }, [query, titles, dismissedAt, text, cursor]);

  useEffect(() => { setChoice(0); }, [query]);

  const complete = (title: string) => {
    const before = text.slice(0, cursor).replace(LINK_QUERY, `[[${title}]]`);
    // Skip a "]]" the user may already have typed after the cursor.
    const after = text.slice(cursor).replace(/^\]\]/, '');
    update(before + after);
    requestAnimationFrame(() => {
      ref.current?.setSelectionRange(before.length, before.length);
      setCursor(before.length);
    });
  };

  const insertAtCursor = (snippet: string) => {
    const el = ref.current;
    const current = latest.current;
    const start = Math.min(el?.selectionStart ?? current.length, current.length);
    const end = Math.min(el?.selectionEnd ?? current.length, current.length);
    const next = current.slice(0, start) + snippet + current.slice(end);
    latest.current = next;
    update(next);
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + snippet.length, start + snippet.length); });
  };

  const onDrop = (e: React.DragEvent) => {
    const files = [...e.dataTransfer.files];
    if (!files.length) return;
    e.preventDefault();
    setOver(false);
    if (!files.some(file => file.type.startsWith('image/'))) { setError('Only images can be added here.'); return; }
    addImages(files);
  };

  const addImages = async (files: File[]) => {
    const images = files.filter(file => file.type.startsWith('image/'));
    if (!images.length) return false;
    setError('');
    for (const file of images) {
      setUploading(n => n + 1);
      try {
        const { url } = await uploadImage(file);
        insertAtCursor(`![${file.name && file.name !== 'image.png' ? file.name.replace(/[\[\]]/g, '') : 'image'}](${url})\n`);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'The image didn’t upload.');
      } finally {
        setUploading(n => n - 1);
      }
    }
    return true;
  };

  const submit = async () => {
    if (!text.trim() || busy || uploading) return;
    setError('');
    const sent = text;
    // Posting clears the box at once so you can keep writing; the text comes back if it fails.
    if (mode === 'enter') {
      update('');
      try { await onSubmit(sent); } catch (e) {
        update(sent);
        setError(e instanceof Error ? e.message : 'That didn’t post.');
      }
      ref.current?.focus();
      return;
    }
    setBusy(true);
    try {
      await onSubmit(sent);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That didn’t save.');
    } finally {
      setBusy(false);
      ref.current?.focus();
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length) {
      if (event.key === 'ArrowDown') { event.preventDefault(); setChoice(c => (c + 1) % suggestions.length); return; }
      if (event.key === 'ArrowUp') { event.preventDefault(); setChoice(c => (c - 1 + suggestions.length) % suggestions.length); return; }
      if (event.key === 'Enter' || event.key === 'Tab') { event.preventDefault(); complete(suggestions[choice]); return; }
      if (event.key === 'Escape') { event.preventDefault(); setDismissedAt(text.slice(0, cursor)); return; }
    }
    const mod = event.metaKey || event.ctrlKey;
    if (mode === 'enter' && event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); }
    if (mode === 'editor' && mod && (event.key === 's' || event.key === 'Enter')) { event.preventDefault(); submit(); }
  };

  return (
    <div className="relative">
      {suggestions.length > 0 && (
        <ul className="absolute bottom-full left-0 z-10 mb-1 w-72 overflow-hidden rounded-md border border-white/15 bg-zinc-900 text-sm shadow-lg" role="listbox">
          {suggestions.map((title, i) => {
            const isNew = i === suggestions.length - 1 && !titles.some(t => t.toLowerCase() === title.toLowerCase());
            return (
              <li key={title + i} role="option" aria-selected={i === choice}>
                <button type="button" onMouseDown={e => { e.preventDefault(); complete(title); }} className={`block w-full truncate px-3 py-1.5 text-left ${i === choice ? 'bg-violet-500/20 text-white' : 'text-zinc-300'}`}>
                  {isNew ? <>New note: <span className="text-violet-300">{title}</span></> : title}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <textarea
        ref={ref}
        value={text}
        rows={minRows}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={e => { update(e.target.value); setCursor(e.target.selectionStart); }}
        onSelect={e => setCursor(e.currentTarget.selectionStart)}
        onKeyDown={onKeyDown}
        onPaste={e => { const files = [...e.clipboardData.files]; if (files.length) { e.preventDefault(); addImages(files); } }}
        onDrop={onDrop}
        onDragOver={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setOver(true); } }}
        onDragLeave={() => setOver(false)}
        className={`block w-full resize-none rounded-md border bg-zinc-950/85 ${over ? 'border-violet-300 shadow-[0_0_0_3px_#c4b5fd33]' : dragging ? 'border-dashed border-violet-300/70' : 'border-white/20'} px-3 py-2.5 text-base leading-relaxed lg:text-[15px] text-zinc-100 placeholder:text-zinc-500 focus:border-violet-400/60 focus:outline-none`}
      />
      <div className="mt-1 flex items-center justify-between text-xs text-zinc-500">
        <span>
          {dragging ? 'Drop images on the box to add them' : uploading > 0 ? `Uploading ${uploading > 1 ? `${uploading} images` : 'image'}…` : busy ? 'Saving…' : mode === 'enter' ? 'Enter to post · Shift+Enter for a new line · paste or drop images' : '⌘S to save · paste or drop images'}
        </span>
        {error && <span role="alert" className="text-red-300">{error}</span>}
      </div>
    </div>
  );
}
