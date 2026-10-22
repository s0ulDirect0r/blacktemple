import { senseHandler, jsonBody, type IdParams } from '@/lib/sense/http';
import { weavePost } from '@/lib/sense/store';

export const dynamic = 'force-dynamic';

/** `{ title }`: append this post to that note, creating the note if needed. */
export const POST = senseHandler<IdParams>(async (actor, request, { params }) => weavePost(actor, (await params).id, (await jsonBody(request)).title));
