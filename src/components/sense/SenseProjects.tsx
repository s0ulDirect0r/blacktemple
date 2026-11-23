'use client';

import { useEffect, useState } from 'react';
import type { SenseProject, SenseTask } from '@/lib/sense/projects';
import { sense } from './api';
import { CountUp, chime } from './juice';

const field = 'w-full rounded-md border border-violet-300/35 bg-black/60 px-4 py-3 text-xl text-zinc-100 placeholder:text-zinc-600 focus:border-violet-300 focus:outline-none';
const quiet = 'rounded border border-white/15 px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/10';
const primary = 'rounded border border-violet-300/40 bg-violet-300/10 px-4 py-2 text-base font-medium text-violet-100 hover:bg-violet-300/20 disabled:opacity-50';
const message = (e: unknown) => (e instanceof Error ? e.message : 'That didn’t work. Try again.');

/** The form for a new project: a name, a description, and tasks typed one per line (Enter adds the next). */
function NewProject({ onCreated, onCancel }: { onCreated: (project: SenseProject) => void; onCancel?: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tasks, setTasks] = useState<string[]>([]);
  const [task, setTask] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const addTask = () => { if (task.trim()) { setTasks(list => [...list, task.trim()]); setTask(''); } };
  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      // A task still in the box counts, so nothing typed is lost.
      onCreated(await sense<SenseProject>('/projects', { method: 'POST', body: JSON.stringify({ name, description, tasks: [...tasks, task] }) }));
    } catch (e) { setError(message(e)); setBusy(false); }
  };

  return (
    <form onSubmit={create} className="space-y-3 rounded-xl border border-violet-300/30 bg-black/50 p-6" aria-label="New project">
      <p className="sense-eyebrow">New project</p>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" aria-label="Project name" autoFocus maxLength={120} className={field} />
      <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" aria-label="Project description" rows={2} className={`${field} resize-y`} />
      {tasks.length > 0 && (
        <ul className="space-y-2">
          {tasks.map((t, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="task-box" aria-hidden="true" />
              <input value={t} onChange={e => setTasks(list => list.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`Task ${i + 1}`} className={`${field} !py-2`} />
              <button type="button" onClick={() => setTasks(list => list.filter((_, j) => j !== i))} aria-label={`Remove task ${i + 1}`} className="px-1 text-xl text-zinc-500 hover:text-zinc-200">×</button>
            </li>
          ))}
        </ul>
      )}
      <input value={task} onChange={e => setTask(e.target.value)} placeholder="Add a task and press Enter (optional)" aria-label="New task"
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTask(); } }} className={field} />
      <div className="flex items-center gap-2">
        <button type="submit" disabled={busy || !name.trim()} className={primary}>{busy ? 'Creating…' : 'Create project'}</button>
        {onCancel && <button type="button" onClick={onCancel} className={quiet}>Cancel</button>}
        {error && <span role="alert" className="text-sm text-red-300">{error}</span>}
      </div>
    </form>
  );
}

/** One task: tick it, click its text to edit (Enter saves, Escape cancels), or remove it. */
function TaskRow({ task, onToggle, onProject, onRemoved, onError }: {
  task: SenseTask; onToggle: (done: boolean) => void; onProject: (project: SenseProject) => void; onRemoved: () => void; onError: (text: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.body);

  const save = () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== task.body) sense<SenseProject>(`/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ body: draft }) }).then(onProject).catch(e => onError(message(e)));
    else setDraft(task.body);
  };
  const remove = () => sense(`/tasks/${task.id}`, { method: 'DELETE' }).then(onRemoved).catch(e => onError(message(e)));

  return (
    <li className="group flex items-center gap-3 rounded-md px-2 py-2 hover:bg-white/[0.04]">
      {/* Re-made when it flips, so the pop plays each time it's ticked. */}
      <button key={String(task.done)} type="button" role="checkbox" aria-checked={task.done} aria-label={`Done: ${task.body}`} onClick={() => onToggle(!task.done)}
        className={`task-box ${task.done ? 'on' : ''}`}>{task.done ? '✓' : ''}</button>
      {editing ? (
        <input value={draft} onChange={e => setDraft(e.target.value)} autoFocus onBlur={save} aria-label="Edit task"
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save(); } if (e.key === 'Escape') { setDraft(task.body); setEditing(false); } }} className={`${field} !py-1.5`} />
      ) : (
        <button type="button" onClick={() => { setDraft(task.body); setEditing(true); }} title="Click to edit"
          className={`min-w-0 flex-1 text-left text-xl leading-snug transition-colors ${task.done ? 'text-zinc-500 line-through decoration-zinc-600' : 'text-zinc-100'}`}>{task.body}</button>
      )}
      <button type="button" onClick={remove} aria-label={`Delete task: ${task.body}`} className="px-1 text-xl text-zinc-600 opacity-0 hover:text-zinc-200 focus:opacity-100 group-hover:opacity-100">×</button>
    </li>
  );
}

function ProjectCard({ project, onChange, onDeleted }: { project: SenseProject; onChange: (project: SenseProject) => void; onDeleted: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [confirming, setConfirming] = useState(false);
  const [task, setTask] = useState('');
  const [burst, setBurst] = useState(false);
  const [error, setError] = useState('');

  const run = (work: Promise<unknown>) => { setError(''); return work.catch(e => setError(message(e))); };
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    run(sense<SenseProject>(`/projects/${project.id}`, { method: 'PATCH', body: JSON.stringify({ name, description }) }).then(p => { onChange(p); setEditing(false); }));
  };
  const addTask = (event: React.FormEvent) => {
    event.preventDefault();
    if (!task.trim()) return;
    run(sense<SenseProject>(`/projects/${project.id}/tasks`, { method: 'POST', body: JSON.stringify({ body: task }) }).then(p => { onChange(p); setTask(''); }));
  };

  const total = project.tasks.length;
  const done = project.tasks.filter(t => t.done).length;
  const complete = total > 0 && done === total;

  /** Tick or untick a task. The page updates at once; the save follows. Each tick chimes a step higher, and the last one bursts. */
  const toggle = (taskId: string, next: boolean) => {
    const before = project;
    const tasks = project.tasks.map(t => (t.id === taskId ? { ...t, done: next } : t));
    onChange({ ...project, tasks });
    setError('');
    if (next) {
      const nowDone = tasks.filter(t => t.done).length;
      chime(nowDone);
      if (nowDone === tasks.length) { setBurst(true); setTimeout(() => setBurst(false), 1000); setTimeout(() => chime(13), 260); }
    }
    sense<SenseProject>(`/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify({ done: next }) }).then(onChange).catch(e => { onChange(before); setError(message(e)); });
  };

  return (
    <article className={`habit-card p-6 lg:p-8 ${complete ? 'done' : ''} ${burst ? 'burst' : ''}`} aria-label={project.name}>
      {editing ? (
        <form onSubmit={save} className="space-y-3">
          <input value={name} onChange={e => setName(e.target.value)} aria-label="Project name" autoFocus maxLength={120} className={field} />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" aria-label="Project description" rows={3} className={`${field} resize-y`} />
          <div className="flex gap-2">
            <button type="submit" disabled={!name.trim()} className={primary}>Save</button>
            <button type="button" onClick={() => { setName(project.name); setDescription(project.description); setEditing(false); }} className={quiet}>Cancel</button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-3xl font-medium leading-tight text-white">{project.name}</h2>
            {project.description && <p className="mt-2 whitespace-pre-wrap text-lg leading-relaxed text-zinc-400">{project.description}</p>}
          </div>
          {total > 0 && (
            <div className="flex-none text-right">
              <p className={`home-num text-3xl ${complete ? 'text-amber-300' : 'text-white'}`}><CountUp value={done} /><span className="text-zinc-500">/{total}</span></p>
              <p className="mt-2 text-base text-zinc-500">{complete ? 'all done' : 'tasks done'}</p>
            </div>
          )}
        </div>
      )}

      {total > 0 && (
        <div className={`home-time mt-6 ${complete ? 'gold' : ''}`} role="img" aria-label={`${done} of ${total} tasks done`}><i style={{ width: `${(done / total) * 100}%` }} /></div>
      )}

      <div className="mt-5">
        <ul className="space-y-0.5">
          {project.tasks.map(t => (
            <TaskRow key={t.id} task={t} onToggle={next => toggle(t.id, next)} onProject={onChange} onError={setError}
              onRemoved={() => onChange({ ...project, tasks: project.tasks.filter(x => x.id !== t.id) })} />
          ))}
        </ul>
        <form onSubmit={addTask} className="mt-3">
          <input value={task} onChange={e => setTask(e.target.value)} placeholder="Add a task and press Enter" aria-label={`Add a task to ${project.name}`} className={field} />
        </form>
      </div>

      {!editing && (
        <div className="mt-5 flex items-center gap-2">
          {confirming ? (
            <>
              <span className="text-sm text-zinc-300">Delete this project{total ? ` and its ${total} task${total === 1 ? '' : 's'}` : ''}?</span>
              <button type="button" onClick={() => run(sense(`/projects/${project.id}`, { method: 'DELETE' }).then(onDeleted))} className="rounded border border-red-300/40 px-3 py-1.5 text-sm text-red-200 hover:bg-red-400/10">Delete</button>
              <button type="button" onClick={() => setConfirming(false)} className={quiet}>Cancel</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => { setName(project.name); setDescription(project.description); setEditing(true); }} className={quiet}>Edit</button>
              <button type="button" onClick={() => setConfirming(true)} className={quiet}>Delete</button>
            </>
          )}
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
    </article>
  );
}

/** The Projects page: a light form for a new project, and every project with its tasks and progress, all editable in place. */
export default function SenseProjects() {
  const [projects, setProjects] = useState<SenseProject[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { sense<{ projects: SenseProject[] }>('/projects').then(r => { setProjects(r.projects); setError(''); }).catch(e => setError(message(e))); }, []);

  const replace = (project: SenseProject) => setProjects(list => list?.map(p => (p.id === project.id ? project : p)) ?? null);

  return (
    <div className="sense-scroll h-full overflow-y-auto px-6 py-8 lg:px-10 [&_.sense-eyebrow]:text-[10px]">
      <div className="mx-auto max-w-6xl space-y-6">
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        {projects && (adding || projects.length === 0
          ? <NewProject onCreated={project => { setProjects(list => [project, ...(list ?? [])]); setAdding(false); }} onCancel={projects.length ? () => setAdding(false) : undefined} />
          : <button type="button" onClick={() => setAdding(true)} className={primary}>+ New project</button>)}
        {projects?.map(project => (
          <ProjectCard key={project.id} project={project} onChange={replace}
            onDeleted={() => setProjects(list => list?.filter(p => p.id !== project.id) ?? null)} />
        ))}
      </div>
    </div>
  );
}
