import { senseHandler } from '@/lib/sense/http';
import { noteMap } from '@/lib/sense/store';

export const dynamic = 'force-dynamic';

/** Notes, unwritten notes and tags as nodes; wiki links and tags as edges. */
export const GET = senseHandler(async () => noteMap());
