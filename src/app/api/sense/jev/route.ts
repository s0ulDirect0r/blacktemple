import { senseHandler, jsonBody } from '@/lib/sense/http';
import { requireOwner } from '@/lib/sense/actor';
import { askJev, jevConfigured } from '@/lib/sense/jev';

export const dynamic = 'force-dynamic';

/** Whether a TypeSafe key is set, so the panel can show setup instead of failing. */
export const GET = senseHandler(async actor => {
  requireOwner(actor);
  return { configured: jevConfigured() };
});

/** `{ source, questions }` → Jev's answers. Owner only: it costs money and sends Sense content to TypeSafe. */
export const POST = senseHandler(async (actor, request) => {
  requireOwner(actor);
  const body = await jsonBody(request);
  return askJev(body.source, body.questions);
});
