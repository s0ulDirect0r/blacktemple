import { senseHandler, jsonBody } from '@/lib/sense/http';
import { createChannel, listChannels, listNotes, listTags } from '@/lib/sense/store';

export const dynamic = 'force-dynamic';

/** The sidebar: channels, notes (written and unwritten) and tags. */
export const GET = senseHandler(async () => {
  const [channels, notes, tags] = await Promise.all([listChannels(), listNotes(), listTags()]);
  return { channels, ...notes, tags };
});

export const POST = senseHandler(async (_actor, request) => ({ slug: await createChannel((await jsonBody(request)).slug) }));
