import test from 'node:test';
import assert from 'node:assert/strict';
import { neonConfig } from '@neondatabase/serverless';

test('route database imports need no credentials and unconfigured queries fail closed', async () => {
  const original = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    const { sql } = await import('../src/lib/db');
    assert.throws(() => sql`SELECT 1`, { message: 'Database is not configured' });
    assert.throws(() => sql('SELECT 1', []), { message: 'Database is not configured' });
    assert.throws(() => sql.transaction([]), { message: 'Database is not configured' });
  } finally {
    if (original === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = original;
  }
});

test('lazy database preserves parameterized queries and transaction behavior', async () => {
  const original = process.env.DATABASE_URL;
  const originalFetch = neonConfig.fetchFunction;
  const requests: { query?: string; params?: string[]; queries?: unknown[] }[] = [];
  process.env.DATABASE_URL = 'postgresql://fixture@localhost/fixture';
  neonConfig.fetchFunction = async (_url: unknown, options: { body: string }) => {
    const body = JSON.parse(options.body);
    requests.push(body);
    const result = { fields: [{ name: 'value', dataTypeID: 23 }], rows: [['7']], rowCount: 1, command: 'SELECT' };
    return new Response(JSON.stringify(body.queries ? { results: body.queries.map(() => result) } : result));
  };
  try {
    const { sql } = await import('../src/lib/db');
    assert.deepEqual(await sql`SELECT ${7} AS value`, [{ value: 7 }]);
    assert.deepEqual(await sql('SELECT $1 AS value', [7]), [{ value: 7 }]);
    assert.deepEqual(await sql.transaction([sql`SELECT ${7} AS value`]), [[{ value: 7 }]]);
    assert.equal(requests[0].query, 'SELECT $1 AS value');
    assert.deepEqual(requests[0].params, ['7']);
    assert.equal(requests[1].query, 'SELECT $1 AS value');
    assert.equal(requests[2].queries?.length, 1);
  } finally {
    neonConfig.fetchFunction = originalFetch;
    if (original === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = original;
  }
});
