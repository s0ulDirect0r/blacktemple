'use client';

import { useEffect, useState } from 'react';
import { sense, timeLabel, type SenseNote, type Sidebar } from './api';

interface Agent { id: string; label: string; lastUsedAt: string | null }

/** How long ago, briefly: "4m ago", "3h ago", or a date. */
function ago(iso: string | null) {
  if (!iso) return 'never active';
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'active now';
  if (minutes < 60) return `active ${minutes}m ago`;
  if (minutes < 24 * 60) return `active ${Math.round(minutes / 60)}h ago`;
  return `active ${timeLabel(iso)}`;
}

function Card({ title, children, onClick }: { title: string; children: React.ReactNode; onClick?: () => void }) {
  const body = <><h3 className="sense-eyebrow mb-3 !text-[#b9f5ff]">{title}</h3>{children}</>;
  const style = 'block w-full rounded-md border border-white/15 bg-black/50 p-4 text-left';
  return onClick
    ? <button type="button" onClick={onClick} className={`${style} hover:border-violet-300/50`}>{body}</button>
    : <section className={style}>{body}</section>;
}

/** Strip markdown and wiki-link brackets for a plain excerpt. */
function excerpt(body: string) {
  return body.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, '$1').replace(/[#*_>`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 220);
}

/** The right-hand panel when nothing is open: the latest note, today's activity and the agents. */
export default function TemplePanel({ sidebar, onOpenNote, onOpenAgents }: { sidebar: Sidebar | null; onOpenNote: (title: string) => void; onOpenAgents: () => void }) {
  const latest = sidebar?.notes[0];
  const [note, setNote] = useState<SenseNote | null>(null);
  const [agents, setAgents] = useState<Agent[] | null>(null);

  useEffect(() => {
    if (!latest) return;
    let live = true;
    sense<{ note: SenseNote | null }>(`/notes/by-title?title=${encodeURIComponent(latest.title)}`).then(r => { if (live) setNote(r.note); }).catch(() => {});
    return () => { live = false; };
  }, [latest]);

  useEffect(() => {
    sense<{ agents: Agent[] }>('/agents').then(r => setAgents(r.agents)).catch(() => setAgents([]));
  }, []);

  const today = sidebar?.today ?? { posts: 0, notes: 0 };
  const lit = Math.min(8, today.posts + today.notes);

  return (
    <div className="space-y-4 p-4">
      {latest ? (
        <Card title={latest.title} onClick={() => onOpenNote(latest.title)}>
          <p className="text-[13px] leading-relaxed text-zinc-300">{note ? excerpt(note.body) || 'An empty note, waiting.' : '…'}</p>
          <p className="mt-3 text-xs text-zinc-500">Latest note · {timeLabel(latest.updatedAt)}{latest.backlinks > 0 && ` · ${latest.backlinks} backlinks`}</p>
        </Card>
      ) : (
        <Card title="Notes"><p className="text-[13px] text-zinc-400">No notes yet. Link a [[title]] in a post to start one.</p></Card>
      )}

      <Card title="Last 24 hours">
        <p className="text-[13px] text-zinc-300">{today.posts} {today.posts === 1 ? 'post' : 'posts'} · {today.notes} {today.notes === 1 ? 'note' : 'notes'} touched</p>
        <div className="mt-3 flex gap-1" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => <span key={i} className={`h-2 w-4 ${i < lit ? 'bg-violet-300' : 'bg-zinc-800'}`} />)}
        </div>
      </Card>

      <Card title="Agents" onClick={onOpenAgents}>
        {agents === null ? <p className="text-[13px] text-zinc-500">…</p> : agents.length === 0 ? (
          <p className="text-[13px] text-zinc-400">No agents yet. Give one a token.</p>
        ) : (
          <ul className="space-y-1 text-[13px]">
            {agents.slice(0, 5).map(agent => (
              <li key={agent.id}><span className="text-[#b9f5ff]">{agent.label}</span> <span className="text-zinc-500">· {ago(agent.lastUsedAt)}</span></li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
