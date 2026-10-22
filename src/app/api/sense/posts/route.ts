import { senseHandler, jsonBody } from '@/lib/sense/http';
import { createPost, listPosts } from '@/lib/sense/store';

export const dynamic = 'force-dynamic';

export const GET = senseHandler(async (_actor, request) => {
  const params = new URL(request.url).searchParams;
  return listPosts(params.get('channel') ?? 'inbox', params.get('before'));
});

/** `{ channel, body }` for a new post, or `{ parentId, body }` for a reply. */
export const POST = senseHandler(async (actor, request) => {
  const body = await jsonBody(request);
  return createPost(actor, { channel: body.channel, parentId: body.parentId, body: body.body });
});
