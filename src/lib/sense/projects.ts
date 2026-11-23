import { randomUUID } from 'node:crypto';
import { membershipDatabase, transaction } from '@/lib/membership/database';
import { MemberError } from '@/lib/membership/errors';

/** Projects in Sense: a name, a description and tasks. Owner only for now. */

export interface SenseTask { id: string; body: string; done: boolean }
export interface SenseProject { id: string; name: string; description: string; createdAt: string; tasks: SenseTask[] }

const MAX_TASKS = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function cleanName(value: unknown, what = 'project') {
  const name = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  if (!name) throw new MemberError(400, `Give the ${what} a name.`);
  if (name.length > 120) throw new MemberError(400, 'Keep the name under 120 characters.');
  return name;
}

export function cleanDescription(value: unknown) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw new MemberError(400, 'The description should be text.');
  const description = value.replace(/\r\n/g, '\n').trim();
  if (description.length > 5000) throw new MemberError(400, 'Keep the description under 5,000 characters.');
  return description;
}

export function cleanTask(value: unknown) {
  const body = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  if (!body) throw new MemberError(400, 'Write the task first.');
  if (body.length > 500) throw new MemberError(400, 'Keep a task under 500 characters.');
  return body;
}

/** Tasks sent with a new project: blank lines are skipped. */
export function cleanTasks(value: unknown) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new MemberError(400, 'Tasks should be a list.');
  const tasks = value.filter(task => typeof task === 'string' && task.trim()).map(cleanTask);
  if (tasks.length > MAX_TASKS) throw new MemberError(400, `Up to ${MAX_TASKS} tasks to start with.`);
  return tasks;
}

function id(value: string, what: string) {
  if (!UUID.test(value)) throw new MemberError(404, `That ${what} doesn’t exist.`);
  return value;
}

interface Row { id: string; name: string; description: string; created_at: Date; task_id: string | null; body: string | null; done_at: Date | null }

function gather(rows: Row[]): SenseProject[] {
  const projects = new Map<string, SenseProject>();
  for (const row of rows) {
    let project = projects.get(row.id);
    if (!project) { project = { id: row.id, name: row.name, description: row.description, createdAt: row.created_at.toISOString(), tasks: [] }; projects.set(row.id, project); }
    if (row.task_id) project.tasks.push({ id: row.task_id, body: row.body ?? '', done: row.done_at !== null });
  }
  return [...projects.values()];
}

const SELECT = `SELECT p.id, p.name, p.description, p.created_at, t.id AS task_id, t.body, t.done_at
  FROM sense_projects p LEFT JOIN sense_project_tasks t ON t.project_id = p.id`;

/** Newest project first; tasks in the order they were added. */
export async function listProjects() {
  const { rows } = await membershipDatabase().query<Row>(`${SELECT} ORDER BY p.created_at DESC, p.id, t.created_at, t.id`);
  return gather(rows);
}

async function getProject(projectId: string) {
  const { rows } = await membershipDatabase().query<Row>(`${SELECT} WHERE p.id = $1 ORDER BY t.created_at, t.id`, [projectId]);
  const [project] = gather(rows);
  if (!project) throw new MemberError(404, 'That project doesn’t exist.');
  return project;
}

export async function createProject(input: Record<string, unknown>) {
  const name = cleanName(input.name), description = cleanDescription(input.description), tasks = cleanTasks(input.tasks);
  const projectId = randomUUID();
  await transaction(async client => {
    await client.query('INSERT INTO sense_projects (id, name, description) VALUES ($1, $2, $3)', [projectId, name, description]);
    // One at a time, each a millisecond apart, so they keep the order they were typed in.
    for (const [i, body] of tasks.entries()) {
      await client.query(`INSERT INTO sense_project_tasks (id, project_id, body, created_at) VALUES ($1, $2, $3, NOW() + ($4 * INTERVAL '1 millisecond'))`, [randomUUID(), projectId, body, i]);
    }
  });
  return getProject(projectId);
}

/** Change the name, the description or both. */
export async function updateProject(projectId: string, input: Record<string, unknown>) {
  id(projectId, 'project');
  const name = input.name === undefined ? null : cleanName(input.name);
  const description = input.description === undefined ? null : cleanDescription(input.description);
  const { rowCount } = await membershipDatabase().query(
    'UPDATE sense_projects SET name = COALESCE($2, name), description = COALESCE($3, description), updated_at = NOW() WHERE id = $1', [projectId, name, description]);
  if (!rowCount) throw new MemberError(404, 'That project doesn’t exist.');
  return getProject(projectId);
}

/** Deletes the project and its tasks. */
export async function deleteProject(projectId: string) {
  await membershipDatabase().query('DELETE FROM sense_projects WHERE id = $1', [id(projectId, 'project')]);
}

export async function addTask(projectId: string, body: unknown) {
  id(projectId, 'project');
  const text = cleanTask(body);
  const { rowCount } = await membershipDatabase().query(
    'INSERT INTO sense_project_tasks (id, project_id, body) SELECT $1, id, $3 FROM sense_projects WHERE id = $2', [randomUUID(), projectId, text]);
  if (!rowCount) throw new MemberError(404, 'That project doesn’t exist.');
  return getProject(projectId);
}

/** Change a task's text, tick it off, or both. Returns its project. */
export async function updateTask(taskId: string, input: Record<string, unknown>) {
  id(taskId, 'task');
  const body = input.body === undefined ? null : cleanTask(input.body);
  if (input.done !== undefined && typeof input.done !== 'boolean') throw new MemberError(400, 'Done is true or false.');
  const done = input.done === undefined ? null : input.done;
  const { rows } = await membershipDatabase().query<{ project_id: string }>(
    `UPDATE sense_project_tasks SET body = COALESCE($2, body),
       done_at = CASE WHEN $3::boolean IS NULL THEN done_at WHEN $3 THEN COALESCE(done_at, NOW()) ELSE NULL END
     WHERE id = $1 RETURNING project_id`, [taskId, body, done]);
  if (!rows[0]) throw new MemberError(404, 'That task doesn’t exist.');
  return getProject(rows[0].project_id);
}

export async function deleteTask(taskId: string) {
  await membershipDatabase().query('DELETE FROM sense_project_tasks WHERE id = $1', [id(taskId, 'task')]);
}
