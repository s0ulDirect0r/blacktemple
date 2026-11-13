import { senseHandler, jsonBody } from '@/lib/sense/http';
import { listNotes, saveNote } from '@/lib/sense/store';

export const dynamic = 'force-dynamic';

export const GET = senseHandler(async () => listNotes());

/** `{ title, body }` creates or replaces by title; `{ id, title, body }` edits (and can rename). Add `baseUpdatedAt` to refuse (412) if the note changed since that version, or `create: true` to refuse (409) if the title is taken. */
export const POST = senseHandler(async (actor, request) => {
  const body = await jsonBody(request);
  return saveNote(actor, { id: body.id, title: body.title, body: body.body, baseUpdatedAt: body.baseUpdatedAt, create: body.create });
});
