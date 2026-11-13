import { MemberError } from '@/lib/membership/errors';
import { getNoteByTitle, listPosts } from './store';

/**
 * Jev, TypeSafe's judgment model, for the Sense playground panel. It reads a state (text or JSON)
 * and answers typed questions with probabilities. It never writes text. Owner only: requests cost
 * money and send Sense content to TypeSafe. https://docs.typesafe.ai
 */

export type JevQuestion =
  | { kind: 'noul'; ask: string; yes?: string; no?: string }
  | { kind: 'choice'; ask: string; options: string[] }
  | { kind: 'score'; ask: string; levels: string[] };

export type JevSource =
  | { kind: 'channel'; slug: string; each: boolean }
  | { kind: 'note'; title: string }
  | { kind: 'text'; text: string };

export type JevAnswer =
  | { type: 'noul'; noul: number }
  | { type: 'choice'; choice: string; confidence: number; probabilities: Record<string, number> }
  | { type: 'score'; score: number; confidence: number; legend: Record<string, string>; probabilities: Record<string, number> };

export interface JevRun { label: string; answers: Record<string, JevAnswer>; /** Set when this call failed; its raw exchange has the details. */ error?: string }

const MODEL = 'jev-latest';
const MAX_QUESTIONS = 12;
const MAX_STATE_CHARS = 100_000;
const CHANNEL_POSTS = 20;
/** USD per million input tokens; output is free (docs.typesafe.ai/models). */
const PRICE_PER_MTOK = 0.042;

export function jevConfigured() {
  return Boolean(process.env.TYPESAFE_API_KEY);
}

const text = (value: unknown, max: number, what: string) => {
  if (typeof value !== 'string' || !value.trim()) throw new MemberError(400, `${what} is empty.`);
  return value.trim().slice(0, max);
};

/** Options as "name" or "name: what it means", one per line. */
function splitOption(line: string) {
  const at = line.indexOf(':');
  return at > 0 ? { name: line.slice(0, at).trim(), meaning: line.slice(at + 1).trim() || line.slice(0, at).trim() } : { name: line.trim(), meaning: line.trim() };
}

/** Validate the panel's questions and turn them into the API's question objects, keyed q1, q2… */
export function toApiQuestions(input: unknown): Record<string, Record<string, unknown>> {
  if (!Array.isArray(input) || input.length === 0) throw new MemberError(400, 'Ask at least one question.');
  if (input.length > MAX_QUESTIONS) throw new MemberError(400, `Up to ${MAX_QUESTIONS} questions at a time.`);
  const out: Record<string, Record<string, unknown>> = {};
  input.forEach((raw, i) => {
    const q = (raw ?? {}) as Record<string, unknown>;
    const ask = text(q.ask, 2000, `Question ${i + 1}`);
    const id = `q${i + 1}`;
    if (q.kind === 'noul') {
      // Optional definitions of what counts as yes and no (the API's `criteria.true` / `criteria.false`).
      const yes = typeof q.yes === 'string' ? q.yes.trim().slice(0, 1000) : '';
      const no = typeof q.no === 'string' ? q.no.trim().slice(0, 1000) : '';
      out[id] = { type: 'noul', instructions: ask, ...(yes || no ? { criteria: { true: yes || null, false: no || null } } : {}) };
      return;
    }
    const lines = Array.isArray(q.kind === 'choice' ? q.options : q.levels)
      ? ((q.kind === 'choice' ? q.options : q.levels) as unknown[]).filter((l): l is string => typeof l === 'string' && l.trim() !== '').map(l => l.trim().slice(0, 300))
      : [];
    if (q.kind === 'choice') {
      if (lines.length < 2 || lines.length > 30) throw new MemberError(400, `Question ${i + 1} needs 2 to 30 options.`);
      const criteria: Record<string, string> = {};
      for (const line of lines) { const { name, meaning } = splitOption(line); criteria[name] = meaning; }
      if (Object.keys(criteria).length < 2) throw new MemberError(400, `Question ${i + 1} has repeated options.`);
      out[id] = { type: 'choice', instructions: ask, criteria };
      return;
    }
    if (q.kind === 'score') {
      if (lines.length < 2 || lines.length > 10) throw new MemberError(400, `Question ${i + 1} needs 2 to 10 levels, lowest first.`);
      out[id] = { type: 'score', instructions: ask, criteria: lines };
      return;
    }
    throw new MemberError(400, `Question ${i + 1} has no type.`);
  });
  return out;
}

/** A time zone the browser sent, if it's a real one. */
export function safeTimeZone(value: unknown): string {
  if (typeof value === 'string' && value.length < 64) {
    try { new Intl.DateTimeFormat('en-GB', { timeZone: value }); return value; } catch { /* not a zone */ }
  }
  return 'UTC';
}

/** "Fri, 13 Nov 2026, 10:42" in Matthew's time zone, so "today" and "recently" mean something to Jev. */
export function readableTime(when: string | Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(when));
}

const WHO = 'In the questions, “I”, “me” and “my” mean Matthew.';

/** The context every state starts with: what this is, who "I" is, and what time it is now. */
export function context(kind: 'channel' | 'note' | 'text', timeZone: string, slug = '') {
  const about = kind === 'channel' ? `Posts from #${slug} in Sense, Matthew’s private notes and journal. Matthew wrote them unless the author says otherwise. ${WHO}`
    : kind === 'note' ? `A note from Sense, Matthew’s private notes. ${WHO}`
    : `Text Matthew pasted in to ask about. It may be by anyone. ${WHO}`;
  return { about, now: `${readableTime(new Date(), timeZone)} (${timeZone})` };
}

/** What Jev looks at: one state, or one per post when asking about each post separately. */
export async function buildStates(input: unknown, timeZoneInput?: unknown): Promise<{ label: string; state: unknown }[]> {
  const source = (input ?? {}) as Record<string, unknown>;
  const zone = safeTimeZone(timeZoneInput);
  if (source.kind === 'text') return [{ label: 'Text', state: { ...context('text', zone), text: text(source.text, MAX_STATE_CHARS, 'The text') } }];
  if (source.kind === 'note') {
    const { note } = await getNoteByTitle(text(source.title, 200, 'The note title'));
    if (!note?.body.trim()) throw new MemberError(404, 'That note has nothing written in it yet.');
    return [{ label: note.title, state: { ...context('note', zone), title: note.title, updated: readableTime(note.updatedAt, zone), body: note.body.slice(0, MAX_STATE_CHARS) } }];
  }
  if (source.kind === 'channel') {
    const slug = text(source.slug, 80, 'The channel');
    const posts = (await listPosts(slug)).posts.slice(-CHANNEL_POSTS);
    if (!posts.length) throw new MemberError(404, `#${slug} has no posts yet.`);
    const shape = (p: (typeof posts)[number]) => ({ author: p.author.label, at: readableTime(p.createdAt, zone), text: p.body.slice(0, 4000) });
    const head = context('channel', zone, slug);
    if (source.each === true) return posts.map(p => ({ label: p.body.replace(/\s+/g, ' ').slice(0, 140), state: { ...head, channel: slug, post: shape(p) } }));
    return [{ label: `#${slug} · last ${posts.length} posts`, state: { ...head, channel: slug, posts: posts.map(shape) } }];
  }
  throw new MemberError(400, 'Choose what Jev should look at.');
}

/** A short, readable reason from a TypeSafe error response. */
export function jevError(status: number, body: unknown): MemberError {
  if (status === 401) return new MemberError(502, 'TypeSafe rejected the API key. Check TYPESAFE_API_KEY.');
  if (status === 429 || status === 529) return new MemberError(503, 'Jev is busy right now. Try again in a moment.');
  const detail = (body as { detail?: unknown } | null)?.detail;
  const reason = typeof detail === 'string' ? detail
    : Array.isArray(detail) ? detail.map(d => (d as { msg?: string }).msg).filter(Boolean).join('; ')
    : '';
  if (status === 400 || status === 422) return new MemberError(400, `Jev couldn’t take that${reason ? `: ${reason.slice(0, 200)}` : '.'}`);
  if (status === 413) return new MemberError(413, 'That’s too much for Jev in one go.');
  return new MemberError(502, `TypeSafe answered ${status}.`);
}

const endpoint = () => `${process.env.TYPESAFE_API_URL ?? 'https://api.typesafe.ai'}/v1/systemone`;

/** The request exactly as it goes over the wire, with the key hidden. */
export function rawRequest(state: unknown, questions: Record<string, Record<string, unknown>>) {
  return {
    method: 'POST',
    url: endpoint(),
    headers: { Authorization: 'Bearer ••••••••', 'Content-Type': 'application/json' },
    body: { model: MODEL, state, questions },
  };
}

/** One call to Jev: the exact request, and the response exactly as received (or why there wasn't one). */
export interface JevExchange {
  label: string;
  request: ReturnType<typeof rawRequest>;
  /** Null until sent (a preview never is). */
  response: { status: number; ms: number; headers: Record<string, string>; body: unknown } | { status: null; ms: number; error: string } | null;
}

async function callJev(exchange: JevExchange): Promise<JevExchange> {
  const started = Date.now();
  try {
    const response = await fetch(exchange.request.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(exchange.request.body),
      signal: AbortSignal.timeout(30_000),
    });
    const text = await response.text();
    let body: unknown = text;
    try { body = JSON.parse(text); } catch { /* not JSON: keep the text as it came */ }
    const headers = Object.fromEntries([...response.headers].filter(([name]) => name !== 'set-cookie'));
    return { ...exchange, response: { status: response.status, ms: Date.now() - started, headers, body } };
  } catch (e) {
    const timedOut = e instanceof Error && e.name === 'TimeoutError';
    return { ...exchange, response: { status: null, ms: Date.now() - started, error: timedOut ? 'No answer within 30 seconds.' : 'Couldn’t reach TypeSafe.' } };
  }
}

/** Exactly what would be sent, without sending it (free, and works before a key is set). */
export async function previewJev(sourceInput: unknown, questionsInput: unknown, timeZone?: unknown) {
  const questions = toApiQuestions(questionsInput);
  const states = await buildStates(sourceInput, timeZone);
  return { raw: states.map((s): JevExchange => ({ label: s.label, request: rawRequest(s.state, questions), response: null })) };
}

/**
 * Run the questions against each state, a few at a time. Each run keeps its raw exchange, and a call that
 * fails is reported on its run instead of failing the rest, so the error TypeSafe sent back can be read.
 */
export async function askJev(sourceInput: unknown, questionsInput: unknown, timeZone?: unknown) {
  if (!jevConfigured()) throw new MemberError(503, 'Jev isn’t set up yet: add TYPESAFE_API_KEY.');
  const questions = toApiQuestions(questionsInput);
  const states = await buildStates(sourceInput, timeZone);
  const runs: JevRun[] = new Array(states.length);
  const raw: JevExchange[] = new Array(states.length);
  let model = MODEL, inputTokens = 0, next = 0;
  const started = Date.now();
  await Promise.all(Array.from({ length: Math.min(5, states.length) }, async () => {
    while (next < states.length) {
      const i = next++;
      const exchange = await callJev({ label: states[i].label, request: rawRequest(states[i].state, questions), response: null });
      raw[i] = exchange;
      const response = exchange.response!;
      if (response.status === null) { runs[i] = { label: states[i].label, answers: {}, error: response.error }; continue; }
      if (response.status < 200 || response.status >= 300) { runs[i] = { label: states[i].label, answers: {}, error: jevError(response.status, response.body).message }; continue; }
      const body = response.body as { model?: string; answers?: Record<string, JevAnswer>; usage?: { input_tokens?: number } };
      model = body.model ?? model;
      inputTokens += body.usage?.input_tokens ?? 0;
      runs[i] = { label: states[i].label, answers: body.answers ?? {} };
    }
  }));
  return { model, runs, inputTokens, costUsd: (inputTokens / 1_000_000) * PRICE_PER_MTOK, ms: Date.now() - started, raw };
}
