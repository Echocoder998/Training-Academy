import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type DB = ReturnType<typeof drizzleNeon<typeof schema>>;
let _db: DB | null = null;

/**
 * Lazily connects so `next build` works before DATABASE_URL is set.
 * Neon in production; a plain Postgres URL (e.g. localhost) also works for local development.
 */
export function db(): DB {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and add your Neon connection string.");
    const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    _db = isLocal
      ? (drizzlePg(new Pool({ connectionString: url }), { schema }) as unknown as DB)
      : drizzleNeon(neon(url), { schema });
  }
  return _db;
}

export * as t from "./schema";
