/**
 * Loads the vocabulary from Y5_set01_to_48.md into the database.
 * Usage: npm run db:seed   (reads DATABASE_URL from .env)
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { directDatabaseUrl } from "@/lib/deployOrigins";
import { parseVocabMarkdown } from "@/lib/parseVocabMarkdown";
import { buildSeedRows } from "@/lib/vocabSeed";
import * as schema from "@/server/db/schema";
import { seedVocab } from "@/server/db/seedVocab";

async function main() {
  const url = directDatabaseUrl(process.env);
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");

  const sourcePath = path.join(process.cwd(), "Y5_set01_to_48.md");
  const parsed = parseVocabMarkdown(fs.readFileSync(sourcePath, "utf8"));

  for (const warning of parsed.warnings) {
    console.warn(`[seed] warning: ${warning.reason}${warning.entryId ? ` (entry ${warning.entryId})` : ""}`);
  }

  const rows = buildSeedRows(parsed);
  const sql = postgres(url, { max: 1 });
  try {
    const result = await seedVocab(drizzle(sql, { schema }), rows);
    console.log(
      `[seed] ${result.words} words in ${result.sets} sets loaded; ${result.removed} removed; ` +
        `${parsed.warnings.length} warnings.`,
    );
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error("[seed] failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
