import "server-only";
import { createHash } from "node:crypto";
import { eq, lt, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { rateLimit } from "@/server/db/schema";

export type RateLimitRule = { limit: number; windowSeconds: number };

/** Attempts per account and per network address. Tuned so a typing child never hits them. */
export const RULES = {
  signInPerEmail: { limit: 10, windowSeconds: 15 * 60 },
  signInPerIp: { limit: 30, windowSeconds: 15 * 60 },
  signUpPerIp: { limit: 10, windowSeconds: 60 * 60 },
  googleStartPerIp: { limit: 30, windowSeconds: 15 * 60 },
} satisfies Record<string, RateLimitRule>;

/** Rate-limit keys never contain an email: it is hashed (lower-cased first). */
export function emailKey(prefix: string, email: string): string {
  return `${prefix}:email:${createHash("sha256").update(email.trim().toLowerCase()).digest("hex")}`;
}

export function ipKey(prefix: string, ip: string): string {
  return `${prefix}:ip:${ip}`;
}

/**
 * The client's address. Assumes the app is deployed behind a proxy/CDN that sets
 * x-forwarded-for (first entry = client). If it is reachable directly, this header can be
 * forged — which is why sign-in is also limited per account, which cannot be.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Counts one attempt against `key` and says whether it is allowed. Atomic (a single upsert),
 * so concurrent requests can't slip past the limit.
 */
export async function consumeRateLimit(
  key: string,
  rule: RateLimitRule,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const expired = sql`${rateLimit.windowStart} <= now() - make_interval(secs => ${rule.windowSeconds})`;
  const [row] = await getDb()
    .insert(rateLimit)
    .values({ key, count: 1 })
    .onConflictDoUpdate({
      target: rateLimit.key,
      set: {
        count: sql`case when ${expired} then 1 else ${rateLimit.count} + 1 end`,
        windowStart: sql`case when ${expired} then now() else ${rateLimit.windowStart} end`,
      },
    })
    .returning({
      count: rateLimit.count,
      retryAfterSeconds: sql<number>`greatest(0, ceil(extract(epoch from (${rateLimit.windowStart} + make_interval(secs => ${rule.windowSeconds}) - now()))))::int`,
    });

  // Clear out rows whose window ended more than a day ago. Keys can contain an IP address, so
  // they are not kept any longer than needed (the privacy page says so). The table is tiny.
  await getDb().delete(rateLimit).where(lt(rateLimit.windowStart, sql`now() - interval '1 day'`));

  return { allowed: row.count <= rule.limit, retryAfterSeconds: row.retryAfterSeconds };
}

export async function resetRateLimit(key: string): Promise<void> {
  await getDb().delete(rateLimit).where(eq(rateLimit.key, key));
}
