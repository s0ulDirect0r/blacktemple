import { senseHandler } from '@/lib/sense/http';
import { byTag } from '@/lib/sense/store';

export const dynamic = 'force-dynamic';

export const GET = senseHandler<{ params: Promise<{ tag: string }> }>(async (_actor, _request, { params }) => ({ results: await byTag((await params).tag) }));
