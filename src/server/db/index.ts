import "server-only";
import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/server/db/schema";

export type Database = PostgresJsDatabase<typeof schema>;

// Reuse one connection pool across hot reloads in development.
const globalForDb = globalThis as unknown as { wordsparkSql?: ReturnType<typeof postgres> };

let db: Database | undefined;

/**
 * Lazily creates the database client, so importing this module (e.g. during `next build`)
 * never needs DATABASE_URL — only running a query does.
 */
export function getDb(): Database {
  if (db) return db;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and start Postgres.");
  }

  const sql = globalForDb.wordsparkSql ?? postgres(url, { max: 10 });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.wordsparkSql = sql;
  }

  db = drizzle(sql, { schema });
  return db;
}
