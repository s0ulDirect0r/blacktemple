'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AdminFeedback, FeedbackKind } from '@/lib/escalation/feedback';

const KINDS: FeedbackKind[] = ['fun', 'hard', 'broken', 'note'];
type Count = { arena: string | null; wave: number | null; kind: FeedbackKind; n: number };

function adminHeaders() {
  return { Authorization: `Bearer ${sessionStorage.getItem('adminSession')}` };
}

function Screenshot({ id }: { id: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const load = async () => {
    const response = await fetch(`/api/admin/feedback/${id}/shot`, { headers: adminHeaders() });
    if (response.ok) setUrl(URL.createObjectURL(await response.blob()));
  };
  if (url) return (
    <a href={url} target="_blank" rel="noreferrer">
      {/* A private blob URL; next/image can't optimize it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Player screenshot" className="mt-2 max-h-64 rounded border border-white/10" />
    </a>
  );
  return <button type="button" onClick={load} className="mt-2 text-sm text-violet-300 underline">Show screenshot</button>;
}

export default function FeedbackPanel() {
  const [kind, setKind] = useState('');
  const [arena, setArena] = useState('');
  const [items, setItems] = useState<AdminFeedback[] | null>(null);
  const [counts, setCounts] = useState<Count[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (kind) params.set('kind', kind);
    if (arena) params.set('arena', arena);
    try {
      const response = await fetch(`/api/admin/feedback?${params}`, { headers: adminHeaders() });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setItems(data.items);
      setCounts(data.counts);
      setError(null);
    } catch {
      setError('Could not load feedback.');
    }
  }, [kind, arena]);

  useEffect(() => { load(); }, [load]);

  const arenas = [...new Set(counts.map(c => c.arena).filter((a): a is string => Boolean(a)))];
  // Where players stop: reactions grouped by arena and wave.
  const byWave = new Map<string, Record<string, number>>();
  for (const c of counts) {
    const key = `${c.arena ?? '—'} · wave ${c.wave ?? '—'}`;
    byWave.set(key, { ...(byWave.get(key) ?? {}), [c.kind]: c.n });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 text-sm">
        <select value={kind} onChange={e => setKind(e.target.value)} className="rounded bg-black/60 p-1">
          <option value="">All kinds</option>
          {KINDS.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <select value={arena} onChange={e => setArena(e.target.value)} className="rounded bg-black/60 p-1">
          <option value="">All arenas</option>
          {arenas.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      {error && <p className="text-red-400">{error}</p>}
      {byWave.size > 0 && (
        <table className="text-left text-sm">
          <thead className="text-gray-400"><tr><th className="pr-6">Arena · wave</th>{KINDS.map(k => <th key={k} className="pr-4">{k}</th>)}</tr></thead>
          <tbody>
            {[...byWave].map(([key, n]) => (
              <tr key={key} className="border-t border-white/10"><td className="pr-6">{key}</td>{KINDS.map(k => <td key={k} className="pr-4">{n[k] ?? ''}</td>)}</tr>
            ))}
          </tbody>
        </table>
      )}
      {items === null ? (!error && <p className="text-gray-400">Loading feedback…</p>) : items.length === 0 ? <p className="text-gray-400">No feedback yet.</p> : (
        <ul className="space-y-4">
          {items.map(item => (
            <li key={item.id} className="border-t border-white/10 pt-3 text-sm">
              <p><strong className="uppercase">{item.kind}</strong> · {new Date(item.createdAt).toLocaleString()} · {item.memberName ?? 'anonymous'}</p>
              <p className="text-gray-400">{[item.arena, item.wave !== null && `wave ${item.wave}`, item.screen, item.killer && `killed by ${item.killer}`, item.seconds !== null && `${Math.round(item.seconds)}s`, item.fps !== null && `${Math.round(item.fps)} fps`, item.build].filter(Boolean).join(' · ')}</p>
              {item.text && <p className="mt-1">{item.text}</p>}
              {item.errors && <pre className="mt-1 whitespace-pre-wrap text-xs text-red-300">{item.errors.join('\n')}</pre>}
              {item.hasShot && <Screenshot id={item.id} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
