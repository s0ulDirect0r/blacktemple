import 'next/dist/server/node-environment-baseline';
import dotenv from 'dotenv';
import { readFile, readdir } from 'node:fs/promises';
import { getMigrations } from 'better-auth/db/migration';
import { memberAuth } from '../src/lib/membership/auth';
import { membershipDatabase, transaction } from '../src/lib/membership/database';

dotenv.config({ path: '.env.local' });
async function main() {
  const url = process.env.MEMBERSHIP_DATABASE_URL;
  if (!url) throw new Error('MEMBERSHIP_DATABASE_URL is required');
  const host = new URL(url).hostname;
  if (!['localhost', '127.0.0.1', '[::1]'].includes(host) && !process.argv.includes('--allow-remote')) throw new Error('Remote migrations require explicit --allow-remote authorization');
  const migration = await getMigrations(memberAuth().options);
  await migration.runMigrations();
  await transaction(async client => {
    await client.query('CREATE TABLE IF NOT EXISTS membership_schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
    for (const file of (await readdir('migrations/membership')).filter(name => name.endsWith('.sql')).sort()) {
      const existing = await client.query('SELECT 1 FROM membership_schema_migrations WHERE name=$1', [file]);
      if (existing.rowCount) continue;
      await client.query(await readFile('migrations/membership/' + file, 'utf8'));
      await client.query('INSERT INTO membership_schema_migrations(name) VALUES ($1)', [file]);
    }
  });
  console.log('Membership auth and application schema migrated.');
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Migration failed'); process.exitCode = 1; }).finally(() => membershipDatabase().end());
