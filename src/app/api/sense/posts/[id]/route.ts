import { senseHandler, jsonBody, type IdParams } from '@/lib/sense/http';
import { deletePost, editPost, getThread } from '@/lib/sense/store';

export const dynamic = 'force-dynamic';

/** A thread: the root post and its replies. */
export const GET = senseHandler<IdParams>(async (_actor, _request, { params }) => getThread((await params).id));

export const PATCH = senseHandler<IdParams>(async (actor, request, { params }) => editPost(actor, (await params).id, (await jsonBody(request)).body));

export const DELETE = senseHandler<IdParams>(async (actor, _request, { params }) => {
  await deletePost(actor, (await params).id);
  return { ok: true };
});
