import { senseHandler, jsonBody } from '@/lib/sense/http';
import { createChannel, listChannels, listNotes, listTags, recentActivity } from '@/lib/sense/store';

export const dynamic = 'force-dynamic';

/** The sidebar: channels, notes (written and unwritten), tags and the last day's activity. */
export const GET = senseHandler(async () => {
  const [channels, notes, tags, today] = await Promise.all([listChannels(), listNotes(), listTags(), recentActivity()]);
  return { channels, ...notes, tags, today };
});

export const POST = senseHandler(async (_actor, request) => ({ slug: await createChannel((await jsonBody(request)).slug) }));
