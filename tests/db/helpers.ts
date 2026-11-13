import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "@/server/db/schema";

export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is not set (see .env.example).");
  if (url === process.env.DEV_DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL must not be the development database.");
  }
  return url;
}

/** Drops everything in the test database and re-applies all migrations. */
export async function resetTestDatabase() {
  const client = postgres(testDatabaseUrl(), { max: 1, onnotice: () => {} });
  const db = drizzle(client, { schema });
  await db.execute(sql`drop schema if exists public cascade`);
  await db.execute(sql`drop schema if exists drizzle cascade`);
  await db.execute(sql`create schema public`);
  await migrate(db, { migrationsFolder: "drizzle" });
  return { db, close: () => client.end() };
}
