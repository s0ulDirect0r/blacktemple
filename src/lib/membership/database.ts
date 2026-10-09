import { Pool, type PoolClient } from 'pg';

let pool: Pool | undefined;
export function membershipDatabase() {
  const connectionString = process.env.MEMBERSHIP_DATABASE_URL;
  if (!connectionString) throw new Error('Membership database is not configured');
  return pool ??= new Pool({ connectionString, max: 5, idleTimeoutMillis: 20000, connectionTimeoutMillis: 5000 });
}
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await membershipDatabase().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
export async function lock(client: PoolClient, key: string) {
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [key]);
}
