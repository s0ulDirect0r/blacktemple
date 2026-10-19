// A local fixture for checkout tests that mock every query, without a .env.
// The database client is initialized only on query use and never connects here.
process.env.DATABASE_URL ??= 'postgres://test:test@localhost/test';
