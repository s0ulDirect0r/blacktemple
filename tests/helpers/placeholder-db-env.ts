// src/lib/db.ts calls neon() at import time, which throws without a connection
// string. Import this first in tests that mock every query so they run without
// a .env. neon() doesn't connect until a query runs.
process.env.DATABASE_URL ??= 'postgres://test:test@localhost/test';
