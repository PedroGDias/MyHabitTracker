import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

// Next dev reloads modules on every edit; without caching on globalThis each
// reload would open a new pool and exhaust connections.
const globalForDb = globalThis as unknown as {
  sql?: ReturnType<typeof postgres>;
  db?: Db;
};

function createDb(): Db {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. See .env.local");
  }
  // `prepare: false` because Supabase's connection pooler (Supavisor, used
  // in production for IPv4 reach and serverless-friendly short connections)
  // runs in transaction mode, which doesn't support session-level prepared
  // statements. Harmless against a direct/local connection too.
  const sql = globalForDb.sql ?? postgres(connectionString, { max: 5, prepare: false });
  if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;
  return drizzle(sql, { schema });
}

// Lazy: Next.js evaluates route modules at build time to collect page data,
// which would throw on a missing DATABASE_URL before any request is served.
// Deferring construction to first actual query keeps a misconfigured env
// from failing the build itself.
export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    if (!globalForDb.db) globalForDb.db = createDb();
    return Reflect.get(globalForDb.db, prop, receiver);
  },
});
