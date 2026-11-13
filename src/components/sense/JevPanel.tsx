'use client';

import { useEffect, useRef, useState } from 'react';
import type { JevAnswer, JevExchange, JevRun } from '@/lib/sense/jev';
import { sense, type Sidebar } from './api';

type Kind = 'noul' | 'choice' | 'score';
interface Question { kind: Kind; ask: string; lines: string; /** Yes/no only: what counts as yes, and as no. */ yes?: string; no?: string }
type SourceKind = 'channel' | 'note' | 'text';
interface Result { model: string; runs: JevRun[]; inputTokens: number; costUsd: number; ms: number; /** One per run, same order. */ raw: JevExchange[] }

const KIND_LABEL: Record<Kind, string> = { noul: 'Yes / no', choice: 'Pick one', score: 'Scale' };
const PRESETS: { name: string; q: Question }[] = [
  { name: 'Needs my attention?', q: { kind: 'noul', ask: 'This needs Matthew’s attention soon', lines: '' } },
  { name: 'Mood', q: { kind: 'score', ask: 'How heated is the writing', lines: 'Calm\nMixed\nHeated' } },
  { name: 'Kind of post', q: { kind: 'choice', ask: 'What kind of post is this', lines: 'idea\ntask: something to do\nfeeling\nquestion\nreference: a link or source to keep' } },
  { name: 'Ready to publish?', q: { kind: 'score', ask: 'How finished does this writing feel', lines: 'Rough notes\nWorking draft\nNearly there\nReady to share' } },
];
const STORE = 'sense-jev-playground';

function load(): { questions: Question[]; source: SourceKind; each: boolean } | null {
  try { return JSON.parse(localStorage.getItem(STORE) ?? 'null'); } catch { return null; }
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

function Bar({ value, strong }: { value: number; strong?: boolean }) {
  return (
    <span className="block h-1.5 w-full bg-zinc-800">
      <span className={`block h-full ${strong ? 'bg-violet-300 shadow-[0_0_6px_#c4b5fd99]' : 'bg-violet-300/40'}`} style={{ width: pct(Math.max(0, Math.min(1, value))) }} />
    </span>
  );
}

/** One answer in full: bars for every option or level. */
function FullAnswer({ answer }: { answer: JevAnswer }) {
  if (answer.type === 'noul') {
    return <div className="space-y-1"><div className="flex justify-between text-zinc-300"><span>{answer.noul >= 0.7 ? 'Yes' : answer.noul <= 0.3 ? 'No' : 'Unsure'}</span><span>{pct(answer.noul)} yes</span></div><Bar value={answer.noul} strong /></div>;
  }
  const rows = answer.type === 'choice'
    ? Object.entries(answer.probabilities).sort((a, b) => b[1] - a[1]).map(([name, p]) => ({ name, p, top: name === answer.choice }))
    : Object.entries(answer.legend).map(([level, name]) => ({ name: `${level} · ${name}`, p: answer.probabilities[level] ?? 0, top: Math.round(answer.score) === Number(level) }));
  return (
    <div className="space-y-1.5">
      {answer.type === 'score' && <p className="text-zinc-300">{answer.score.toFixed(2)} on 0–{Object.keys(answer.legend).length - 1}</p>}
      {rows.map(row => (
        <div key={row.name}>
          <div className={`flex justify-between gap-2 ${row.top ? 'text-white' : 'text-zinc-500'}`}><span className="truncate">{row.name}</span><span>{pct(row.p)}</span></div>
          <Bar value={row.p} strong={row.top} />
        </div>
      ))}
      <p className="text-[11px] text-zinc-500">Confidence {pct(answer.confidence)}</p>
    </div>
  );
}

/** One answer as a chip, for the post-by-post table. */
function Chip({ answer }: { answer: JevAnswer }) {
  const [label, strong] = answer.type === 'noul' ? [pct(answer.noul), answer.noul >= 0.7]
    : answer.type === 'choice' ? [answer.choice, answer.confidence >= 0.5]
    : [answer.legend[String(Math.round(answer.score))] ?? answer.score.toFixed(1), answer.confidence >= 0.5];
  return <span className={`rounded px-1.5 py-0.5 text-[11px] ${strong ? 'bg-violet-300/20 text-violet-100' : 'bg-white/5 text-zinc-400'}`}>{label}</span>;
}

const json = (value: unknown) => (typeof value === 'string' ? value : JSON.stringify(value, null, 2));

/** The same request as a shell command. It reads the key from your environment, so none is in the text. */
function asCurl(request: JevExchange['request']) {
  const body = JSON.stringify(request.body).replace(/'/g, `'\\''`);
  return `curl -X ${request.method} ${request.url} \\\n  -H "Authorization: Bearer $TYPESAFE_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${body}'`;
}

function Copy({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const copy = () => navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1200); }).catch(() => { /* clipboard blocked */ });
  return <button type="button" onClick={copy} className="rounded border border-white/15 px-1.5 py-0.5 text-[11px] text-zinc-400 hover:bg-white/10 hover:text-zinc-200">{done ? 'Copied' : label}</button>;
}

/**
 * The HTTP exchange with TypeSafe, exactly: the request as sent (key hidden) and the response as received.
 * One per call, so asking post by post gives a stepper.
 */
function RawExchanges({ raw, at, onAt }: { raw: JevExchange[]; at: number; onAt: (i: number) => void }) {
  const [side, setSide] = useState<'input' | 'output'>('output');
  const i = Math.max(0, Math.min(at, raw.length - 1));
  const exchange = raw[i];
  if (!exchange) return null;
  const { request, response } = exchange;
  const showing = response ? side : 'input';
  const pre = 'sense-scroll max-h-96 overflow-auto whitespace-pre-wrap break-words rounded bg-black/70 p-2 font-mono text-[11px] leading-relaxed';
  const step = 'rounded border border-white/15 px-1.5 disabled:opacity-30';
  const failed = response && (response.status === null || response.status < 200 || response.status >= 300);

  return (
    <div className="space-y-2">
      {raw.length > 1 && (
        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
          <button type="button" onClick={() => onAt(i - 1)} disabled={i === 0} className={step} aria-label="Previous call">‹</button>
          <span className="shrink-0">Call {i + 1} of {raw.length}</span>
          <button type="button" onClick={() => onAt(i + 1)} disabled={i === raw.length - 1} className={step} aria-label="Next call">›</button>
          <span className="truncate text-zinc-600" title={exchange.label}>{exchange.label}</span>
        </div>
      )}
      <div className="flex items-center gap-1">
        {response && (['input', 'output'] as const).map(s => (
          <button key={s} type="button" aria-pressed={showing === s} onClick={() => setSide(s)}
            className={`rounded px-2 py-0.5 text-[11px] ${showing === s ? 'bg-violet-300/15 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {s === 'input' ? 'Raw input' : 'Raw output'}{s === 'output' && failed ? ' ⚠' : ''}
          </button>
        ))}
        <span className="ml-auto flex gap-1">
          {showing === 'input' ? <><Copy text={json(request.body)} label="Copy JSON" /><Copy text={asCurl(request)} label="Copy as curl" /></>
            : response && 'body' in response && <Copy text={json(response.body)} label="Copy JSON" />}
        </span>
      </div>
      {showing === 'input' ? (
        <pre className={pre} aria-label="Raw input">
          <span className="text-zinc-500">{`${request.method} ${request.url}\n${Object.entries(request.headers).map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n`}</span>
          <span className="text-zinc-300">{json(request.body)}</span>
        </pre>
      ) : response && response.status === null ? (
        <pre className={pre} aria-label="Raw output"><span className="text-red-300">{`No response (${response.ms} ms)\n${response.error}`}</span></pre>
      ) : response && (
        <pre className={pre} aria-label="Raw output">
          <span className={failed ? 'text-red-300' : 'text-emerald-300'}>{`HTTP ${response.status}`}</span>
          <span className="text-zinc-500">{` · ${response.ms} ms\n${Object.entries(response.headers).map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n`}</span>
          <span className="text-zinc-300">{json(response.body)}</span>
        </pre>
      )}
    </div>
  );
}

/** A playground for Jev in the right-hand panel: choose what it looks at, ask typed questions, see the probabilities. */
export default function JevPanel({ sidebar, channel }: { sidebar: Sidebar | null; /** The channel you're in, if any: Jev looks there by default. */ channel: string | null }) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [source, setSource] = useState<SourceKind>('channel');
  const [slug, setSlug] = useState(channel ?? 'inbox');
  const [each, setEach] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [text, setText] = useState('');
  const [questions, setQuestions] = useState<Question[]>([PRESETS[0].q]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ asked: Question[]; data: Result } | null>(null);
  const [preview, setPreview] = useState<JevExchange[] | null>(null);
  const [previewAt, setPreviewAt] = useState(0);
  const [rawAt, setRawAt] = useState(0);
  const [rawOpen, setRawOpen] = useState(false);
  const rawRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => { sense<{ configured: boolean }>('/jev').then(r => setConfigured(r.configured)).catch(() => setConfigured(false)); }, []);
  useEffect(() => {
    const saved = load();
    if (saved) { setQuestions(saved.questions?.length ? saved.questions : [PRESETS[0].q]); setSource(saved.source ?? 'channel'); setEach(!!saved.each); }
  }, []);
  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify({ questions, source, each })); } catch { /* private window */ } }, [questions, source, each]);
  useEffect(() => { if (channel) setSlug(channel); }, [channel]);
  useEffect(() => { if (!noteTitle && sidebar?.notes[0]) setNoteTitle(sidebar.notes[0].title); }, [sidebar, noteTitle]);

  const update = (i: number, patch: Partial<Question>) => setQuestions(qs => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  const payload = () => ({
    source: source === 'channel' ? { kind: 'channel', slug, each } : source === 'note' ? { kind: 'note', title: noteTitle } : { kind: 'text', text },
    questions: questions.map(q => ({ kind: q.kind, ask: q.ask, options: q.lines.split('\n'), levels: q.lines.split('\n'), yes: q.yes, no: q.no })),
    // So post times and "now" read in your time, not the server's.
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  /** Show the exact request, without sending it. */
  const look = async () => {
    setError('');
    if (preview) { setPreview(null); return; }
    try {
      const { raw } = await sense<{ raw: JevExchange[] }>('/jev', { method: 'POST', body: JSON.stringify({ ...payload(), preview: true }) });
      setPreviewAt(0); setPreview(raw);
    } catch (e) { setError(e instanceof Error ? e.message : 'Couldn’t build that.'); }
  };

  const ask = async () => {
    setBusy(true); setError(''); setPreview(null);
    try {
      const data = await sense<Result>('/jev', { method: 'POST', body: JSON.stringify(payload()) });
      // Asking about each post: put the likeliest "yes" first when the first question is a yes/no. Raw calls follow the same order.
      const yes = (run: JevRun) => (run.answers.q1 as { noul?: number } | undefined)?.noul ?? -1;
      const order = data.runs.map((_, i) => i);
      if (questions[0]?.kind === 'noul') order.sort((a, b) => yes(data.runs[b]) - yes(data.runs[a]));
      setResult({ asked: questions, data: { ...data, runs: order.map(i => data.runs[i]), raw: order.map(i => data.raw[i]) } });
      setRawAt(0);
      // One call that failed: open the raw view, since what TypeSafe said is the useful part.
      setRawOpen(data.runs.length === 1 && !!data.runs[0].error);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Jev didn’t answer.');
    } finally {
      setBusy(false);
    }
  };

  const openRaw = (i: number) => {
    setRawAt(i); setRawOpen(true);
    requestAnimationFrame(() => rawRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  };

  const field = 'w-full rounded border border-white/15 bg-black/60 px-2 py-1.5 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:border-violet-300/50 focus:outline-none';
  const card = 'rounded-md border border-white/15 bg-black/50 p-4';
  const failures = result?.data.runs.filter(r => r.error).length ?? 0;

  return (
    <div className="space-y-4 p-4 text-[13px]">
      <div>
        <p className="sense-eyebrow !text-[#b9f5ff]">Jev</p>
        <p className="mt-1 text-xs text-zinc-500">TypeSafe’s judgment model. It reads what you point it at and answers typed questions with probabilities. It never writes text.</p>
      </div>

      {configured === false && (
        <div className="rounded-md border border-amber-300/30 bg-amber-300/5 p-3 text-xs leading-relaxed text-amber-100">
          Not set up yet. Create a key at <a href="https://console.typesafe.ai/keys" target="_blank" rel="noreferrer" className="underline">console.typesafe.ai/keys</a>, add it to Vercel as <code>TYPESAFE_API_KEY</code>, and redeploy.
        </div>
      )}

      <section className={card}>
        <h3 className="sense-eyebrow mb-3">Looking at</h3>
        <div className="mb-3 flex gap-1" role="tablist">
          {(['channel', 'note', 'text'] as const).map(kind => (
            <button key={kind} type="button" role="tab" aria-selected={source === kind} onClick={() => setSource(kind)}
              className={`rounded px-2.5 py-1 text-xs capitalize ${source === kind ? 'bg-violet-300/15 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}>{kind}</button>
          ))}
        </div>
        {source === 'channel' && (
          <div className="space-y-2">
            <select value={slug} onChange={e => setSlug(e.target.value)} className={field} aria-label="Channel">
              {(sidebar?.channels ?? [{ slug }]).map(c => <option key={c.slug} value={c.slug}>#{c.slug}</option>)}
            </select>
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              <input type="checkbox" checked={each} onChange={e => setEach(e.target.checked)} className="accent-violet-300" />
              Ask about each post separately (last 20)
            </label>
          </div>
        )}
        {source === 'note' && (
          <select value={noteTitle} onChange={e => setNoteTitle(e.target.value)} className={field} aria-label="Note">
            {(sidebar?.notes ?? []).map(n => <option key={n.id} value={n.title}>{n.title}</option>)}
          </select>
        )}
        {source === 'text' && <textarea value={text} onChange={e => setText(e.target.value)} rows={5} placeholder="Paste anything…" className={field} aria-label="Text for Jev" />}
        <p className="mt-2 text-[11px] text-zinc-600">This is sent to TypeSafe when you ask.</p>
      </section>

      <section className={card}>
        <h3 className="sense-eyebrow mb-3">Questions</h3>
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={i} className="space-y-1.5 border-l border-violet-300/30 pl-3">
              <div className="flex items-center gap-2">
                <select value={q.kind} onChange={e => update(i, { kind: e.target.value as Kind })} className="rounded border border-white/15 bg-black/60 px-1.5 py-1 text-xs text-zinc-200" aria-label={`Question ${i + 1} type`}>
                  {(Object.keys(KIND_LABEL) as Kind[]).map(k => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                </select>
                {questions.length > 1 && <button type="button" onClick={() => setQuestions(qs => qs.filter((_, j) => j !== i))} aria-label={`Remove question ${i + 1}`} className="ml-auto text-zinc-500 hover:text-zinc-200">×</button>}
              </div>
              <input value={q.ask} onChange={e => update(i, { ask: e.target.value })} placeholder={q.kind === 'noul' ? 'A statement that’s true or false' : 'What to judge'} className={field} aria-label={`Question ${i + 1}`} />
              {q.kind === 'noul' && (
                <div className="grid grid-cols-2 gap-1.5">
                  <input value={q.yes ?? ''} onChange={e => update(i, { yes: e.target.value })} placeholder="Counts as yes (optional)" className={field} aria-label={`Question ${i + 1}: what counts as yes`} />
                  <input value={q.no ?? ''} onChange={e => update(i, { no: e.target.value })} placeholder="Counts as no (optional)" className={field} aria-label={`Question ${i + 1}: what counts as no`} />
                </div>
              )}
              {q.kind !== 'noul' && (
                <textarea value={q.lines} onChange={e => update(i, { lines: e.target.value })} rows={Math.max(2, q.lines.split('\n').length)}
                  placeholder={q.kind === 'choice' ? 'One option per line\noption: what it means' : 'One level per line, lowest first'}
                  className={field} aria-label={`Question ${i + 1} ${q.kind === 'choice' ? 'options' : 'levels'}`} />
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => setQuestions(qs => [...qs, { kind: 'noul', ask: '', lines: '' }])} className="rounded border border-white/15 px-2 py-1 text-xs text-zinc-300 hover:bg-white/10">+ Question</button>
          {PRESETS.map(p => (
            <button key={p.name} type="button" onClick={() => setQuestions(qs => [...qs.filter(q => q.ask.trim()), p.q])} className="rounded bg-white/5 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200">{p.name}</button>
          ))}
        </div>
      </section>

      <div className="flex gap-2">
        <button type="button" onClick={ask} disabled={busy || configured === false}
          className="flex-1 rounded-md border border-violet-300/40 bg-violet-300/10 px-3 py-2 font-medium text-violet-100 hover:bg-violet-300/20 disabled:opacity-50">
          {busy ? 'Asking Jev…' : 'Ask Jev'}
        </button>
        <button type="button" onClick={look} aria-pressed={!!preview} title="See the exact request, without sending it"
          className={`rounded-md border px-3 py-2 text-xs ${preview ? 'border-[#b9f5ff]/50 text-[#b9f5ff]' : 'border-white/15 text-zinc-300 hover:bg-white/10'}`}>
          What Jev sees
        </button>
      </div>
      {error && <p role="alert" className="text-xs text-red-300">{error}</p>}

      {preview && (
        <section className={card}>
          <h3 className="sense-eyebrow mb-3 !text-[#b9f5ff]">What Jev sees</h3>
          <p className="mb-2 text-[11px] text-zinc-500">Nothing has been sent. This is the exact request Ask Jev would make{preview.length > 1 ? `, once per post (${preview.length} calls)` : ''}.</p>
          <RawExchanges raw={preview} at={previewAt} onAt={setPreviewAt} />
        </section>
      )}

      {result && (
        <section className={card} aria-live="polite">
          <h3 className="sense-eyebrow mb-3 !text-[#b9f5ff]">Answers</h3>
          {result.data.runs.length === 1 ? (
            result.data.runs[0].error ? (
              <p role="alert" className="text-xs text-red-300">{result.data.runs[0].error} TypeSafe’s full reply is in the raw output below.</p>
            ) : (
              <div className="space-y-4">
                {result.asked.map((q, i) => result.data.runs[0].answers[`q${i + 1}`] && (
                  <div key={i}>
                    <p className="mb-1.5 text-zinc-200">{q.ask}</p>
                    <FullAnswer answer={result.data.runs[0].answers[`q${i + 1}`]} />
                  </div>
                ))}
              </div>
            )
          ) : (
            <ul className="space-y-2.5">
              {result.data.runs.map((run, r) => (
                <li key={r} className="border-b border-white/5 pb-2.5 last:border-0">
                  <p className="line-clamp-2 text-zinc-300">{run.label}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {run.error
                      ? <span className="rounded bg-red-400/15 px-1.5 py-0.5 text-[11px] text-red-200" title={run.error}>Failed</span>
                      : result.asked.map((q, i) => run.answers[`q${i + 1}`] && <span key={i} title={q.ask}><Chip answer={run.answers[`q${i + 1}`]} /></span>)}
                    <button type="button" onClick={() => openRaw(r)} className="ml-auto text-[11px] text-zinc-600 hover:text-zinc-300" aria-label={`Raw input and output for call ${r + 1}`}>raw</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <details ref={rawRef} open={rawOpen} onToggle={e => setRawOpen(e.currentTarget.open)} className="mt-4">
            <summary className="cursor-pointer text-[11px] text-zinc-500 hover:text-zinc-300">Raw input / output</summary>
            <div className="mt-2"><RawExchanges raw={result.data.raw} at={rawAt} onAt={setRawAt} /></div>
          </details>
          <p className="mt-3 text-[11px] text-zinc-600">
            {result.data.model} · {result.data.inputTokens.toLocaleString()} tokens · ${result.data.costUsd < 0.0001 ? '<0.0001' : result.data.costUsd.toFixed(4)} · {(result.data.ms / 1000).toFixed(1)}s
            {failures > 0 && <span className="text-red-300/80"> · {failures} of {result.data.runs.length} failed</span>}
          </p>
        </section>
      )}
    </div>
  );
}
