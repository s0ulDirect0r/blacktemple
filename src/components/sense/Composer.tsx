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

  useEffect(() => { setText(initial); }, [initial]);

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

  const insertAtCursor = useCallback((snippet: string) => {
    const el = ref.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = text.slice(0, start) + snippet + text.slice(end);
    update(next);
    requestAnimationFrame(() => el?.setSelectionRange(start + snippet.length, start + snippet.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

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
    setBusy(true);
    setError('');
    try {
      await onSubmit(text);
      if (mode === 'enter') update('');
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
        onDrop={e => { const files = [...e.dataTransfer.files]; if (files.length) { e.preventDefault(); addImages(files); } }}
        onDragOver={e => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); }}
        className="block w-full resize-none rounded-md border border-white/15 bg-black/40 px-3 py-2 text-base leading-relaxed lg:text-[15px] text-zinc-100 placeholder:text-zinc-500 focus:border-violet-400/60 focus:outline-none"
      />
      <div className="mt-1 flex items-center justify-between text-xs text-zinc-500">
        <span>
          {uploading > 0 ? 'Uploading image…' : busy ? 'Saving…' : mode === 'enter' ? 'Enter to post · Shift+Enter for a new line · [[ to link · paste images' : '⌘S to save · [[ to link · paste images'}
        </span>
        {error && <span role="alert" className="text-red-300">{error}</span>}
      </div>
    </div>
  );
}
