'use client';

import { useCallback, useEffect, useState } from 'react';
import { sense, timeLabel } from './api';

interface Agent { id: string; label: string; createdAt: string; lastUsedAt: string | null }

/** Name an agent, get its token once, connect it over MCP, and revoke it later. */
export default function AgentsPane() {
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [label, setLabel] = useState('');
  const [created, setCreated] = useState<{ label: string; token: string } | null>(null);
  const [copied, setCopied] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => sense<{ agents: Agent[] }>('/agents').then(r => setAgents(r.agents)).catch(e => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!label.trim()) return;
    try {
      const result = await sense<{ label: string; token: string }>('/agents', { method: 'POST', body: JSON.stringify({ label }) });
      setCreated(result);
      setLabel('');
      load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Couldn’t create the agent.'); }
  };

  const revoke = async (agent: Agent) => {
    if (!window.confirm(`Revoke ${agent.label}? It stops working immediately.`)) return;
    await sense(`/agents/${agent.id}`, { method: 'DELETE' }).catch(e => setError(e.message));
    load();
  };

  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const command = created
    ? `claude mcp add --transport http black-temple ${origin}/api/mcp --header "Authorization: Bearer ${created.token}"`
    : '';
  const copy = async (text: string, what: string) => { await navigator.clipboard.writeText(text); setCopied(what); };

  return (
    <div className="space-y-5 p-4 text-sm">
      <div>
        <h2 className="text-lg font-semibold text-white">Agents and MCP</h2>
        <p className="mt-1 text-zinc-400">Give a Claude session its own token. It can read Sense and post, reply and write notes under its own name through the MCP server at <code className="text-zinc-300">/api/mcp</code>.</p>
      </div>

      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); create(); }}>
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Agent name, e.g. Claude (laptop)" maxLength={60}
          className="flex-1 rounded border border-white/15 bg-black/40 px-2 py-1 text-zinc-100" aria-label="Agent name" />
        <button type="submit" className="rounded border border-white/20 px-3 text-zinc-200 hover:bg-white/10">Create</button>
      </form>

      {created && (
        <div className="space-y-3 rounded-md border border-amber-400/40 bg-amber-400/5 p-3">
          <p className="text-amber-200">Copy <strong>{created.label}</strong>’s token now. It won’t be shown again.</p>
          <div>
            <p className="mb-1 text-xs text-zinc-500">Connect Claude Code (run in a terminal):</p>
            <pre className="whitespace-pre-wrap break-all rounded bg-black/60 p-2 text-xs text-zinc-200">{command}</pre>
            <button type="button" onClick={() => copy(command, 'command')} className="mt-1 text-xs text-violet-300 hover:text-violet-200">{copied === 'command' ? 'Copied' : 'Copy command'}</button>
          </div>
          <div>
            <p className="mb-1 text-xs text-zinc-500">Or the token alone, for other MCP clients:</p>
            <button type="button" onClick={() => copy(created.token, 'token')} className="text-xs text-violet-300 hover:text-violet-200">{copied === 'token' ? 'Copied' : 'Copy token'}</button>
          </div>
          <button type="button" onClick={() => { setCreated(null); setCopied(''); }} className="text-xs text-zinc-400 underline">I’ve saved it</button>
        </div>
      )}

      {error && <p role="alert" className="text-red-300">{error}</p>}

      <section>
        <h3 className="mb-2 text-xs text-zinc-500">Active agents</h3>
        {agents === null ? <p className="text-zinc-500">Loading…</p> : agents.length === 0 ? <p className="text-zinc-500">None yet.</p> : (
          <ul className="space-y-2">
            {agents.map(agent => (
              <li key={agent.id} className="flex items-baseline justify-between gap-3 rounded border border-white/10 px-3 py-2">
                <span>
                  <span className="text-sky-300">{agent.label}</span>
                  <span className="block text-xs text-zinc-500">Created {timeLabel(agent.createdAt)} · {agent.lastUsedAt ? `last used ${timeLabel(agent.lastUsedAt)}` : 'never used'}</span>
                </span>
                <button type="button" onClick={() => revoke(agent)} className="text-xs text-zinc-500 hover:text-red-300">Revoke</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
