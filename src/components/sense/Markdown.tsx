'use client';

import { memo, useEffect, useState } from 'react';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toRenderableMarkdown } from '@/lib/sense/text';
import { imageObjectUrl } from './api';

export type SenseTarget = { kind: 'note'; title: string } | { kind: 'tag'; tag: string } | { kind: 'post'; id: string };

/** Pasted images are private: load them with the admin token. */
function PrivateImage({ src, alt }: { src: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let objectUrl: string | null = null;
    imageObjectUrl(src).then(u => { objectUrl = u; setUrl(u); }).catch(() => setFailed(true));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src]);
  if (failed) return <span className="text-xs text-red-300">[image unavailable]</span>;
  if (!url) return <span className="inline-block h-24 w-40 animate-pulse rounded bg-white/5" />;
  return (
    <a href={url} target="_blank" rel="noreferrer">
      {/* Object URLs for private images; next/image can't load these. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={alt} className="my-2 max-h-80 max-w-full rounded border border-white/10" />
    </a>
  );
}

function parseTarget(href: string): SenseTarget | null {
  const [, kind, value] = href.match(/^sense:(note|tag|post)\/(.+)$/) ?? [];
  if (!kind) return null;
  const decoded = decodeURIComponent(value);
  return kind === 'note' ? { kind, title: decoded } : kind === 'tag' ? { kind, tag: decoded } : { kind: 'post', id: decoded };
}

function Markdown({ text, onOpen, existingNotes }: { text: string; onOpen: (target: SenseTarget) => void; existingNotes?: Set<string> }) {
  return (
    <div className="sense-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        // Allow our in-app scheme; everything else keeps react-markdown's safe default.
        urlTransform={url => (url.startsWith('sense:') ? url : defaultUrlTransform(url))}
        components={{
          a({ href = '', children }) {
            const target = parseTarget(href);
            if (!target) return <a href={href} target="_blank" rel="noreferrer noopener" className="text-sky-300 underline">{children}</a>;
            const ghost = target.kind === 'note' && existingNotes && !existingNotes.has(target.title.trim().toLowerCase());
            const style = target.kind === 'tag' ? 'text-zinc-400 hover:text-zinc-200' : ghost ? 'text-violet-300/60 underline decoration-dotted' : 'text-violet-300 hover:text-violet-200';
            return <button type="button" onClick={() => onOpen(target)} className={style}>{children}</button>;
          },
          img({ src, alt }) {
            const url = typeof src === 'string' ? src : '';
            if (url.startsWith('/api/sense/images/')) return <PrivateImage src={url} alt={alt ?? ''} />;
            return <a href={url} target="_blank" rel="noreferrer noopener" className="text-sky-300 underline">{alt || url}</a>;
          },
        }}
      >
        {toRenderableMarkdown(text)}
      </ReactMarkdown>
    </div>
  );
}

export default memo(Markdown);
