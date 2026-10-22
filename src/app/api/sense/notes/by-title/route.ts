import { senseHandler } from '@/lib/sense/http';
import { MemberError } from '@/lib/membership/errors';
import { getNoteByTitle } from '@/lib/sense/store';

export const dynamic = 'force-dynamic';

/** A note by title, written or not, with its backlinks. */
export const GET = senseHandler(async (_actor, request) => {
  const title = new URL(request.url).searchParams.get('title');
  if (!title?.trim()) throw new MemberError(400, 'Which note?');
  return getNoteByTitle(title);
});
