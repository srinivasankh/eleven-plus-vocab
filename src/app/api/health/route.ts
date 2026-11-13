import { sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { log } from "@/server/log";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

/**
 * For uptime monitors and load balancers: 200 when the app can reach its database, 503 when
 * it can't. Deliberately reveals nothing else (no versions, no error details).
 */
export async function GET() {
  const started = Date.now();
  try {
    await getDb().execute(sql`select 1`);
    return Response.json(
      { status: "ok", database: "ok", responseTimeMs: Date.now() - started },
      { status: 200, headers },
    );
  } catch (error) {
    log.error("health.database_unreachable", error);
    return Response.json({ status: "error", database: "unreachable" }, { status: 503, headers });
  }
}
