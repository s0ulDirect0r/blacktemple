import { senseHandler } from '@/lib/sense/http';
import { exportVault } from '@/lib/sense/export';

export const dynamic = 'force-dynamic';

/** Everything as a zip that opens as an Obsidian vault. */
export const GET = senseHandler(async () => exportVault());
