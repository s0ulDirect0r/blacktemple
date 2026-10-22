import { senseHandler } from '@/lib/sense/http';
import { search } from '@/lib/sense/store';

export const dynamic = 'force-dynamic';

export const GET = senseHandler(async (_actor, request) => ({ results: await search(new URL(request.url).searchParams.get('q')) }));
