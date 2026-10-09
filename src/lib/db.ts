import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let client: NeonQueryFunction<false, false> | undefined;

function database() {
  if (!client) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('Database is not configured');
    client = neon(connectionString);
  }
  return client;
}

// Route imports and builds need no credentials. Queries still fail closed when
// the existing gallery/call database is unconfigured; no fallback database is used.
const sql = new Proxy((() => {}) as unknown as NeonQueryFunction<false, false>, {
  apply(_target, thisArg, args) {
    return Reflect.apply(database(), thisArg, args);
  },
  get(_target, property) {
    const value = Reflect.get(database(), property);
    return typeof value === 'function' ? value.bind(database()) : value;
  },
});

export { sql };
