import { senseHandler, jsonBody } from '@/lib/sense/http';
import { requireOwner } from '@/lib/sense/actor';
import { createProject, listProjects } from '@/lib/sense/projects';

export const dynamic = 'force-dynamic';

export const GET = senseHandler(async actor => {
  requireOwner(actor);
  return { projects: await listProjects() };
});

/** `{ name, description?, tasks?: string[] }` → the new project with its tasks. */
export const POST = senseHandler(async (actor, request) => {
  requireOwner(actor);
  return createProject(await jsonBody(request));
});
