import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { rateLimit } from "@/server/db/schema";
import { clientIp, consumeRateLimit, emailKey, ipKey, resetRateLimit } from "@/server/rateLimit";
import { resetTestDatabase } from "./helpers";

let ctx: Awaited<ReturnType<typeof resetTestDatabase>>;

beforeAll(async () => {
  ctx = await resetTestDatabase();
});

afterAll(async () => {
  await ctx.close();
});

describe("sign-in rate limiting", () => {
  it("allows up to the limit, then refuses with a wait time", async () => {
    const key = emailKey("sign_in", "pat@example.test");
    const rule = { limit: 3, windowSeconds: 900 };
    const results = [];
    for (let i = 0; i < 5; i += 1) results.push(await consumeRateLimit(key, rule));
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false, false]);
    expect(results[4].retryAfterSeconds).toBeGreaterThan(800);

    await resetRateLimit(key); // a correct password clears it
    expect((await consumeRateLimit(key, rule)).allowed).toBe(true);
  });

  it("can't be beaten by sending many requests at once", async () => {
    const key = ipKey("sign_in", "203.0.113.7");
    const outcomes = await Promise.all(
      Array.from({ length: 20 }, () => consumeRateLimit(key, { limit: 5, windowSeconds: 900 })),
    );
    expect(outcomes.filter((o) => o.allowed)).toHaveLength(5);
  });

  it("starts a fresh window once the old one has passed", async () => {
    const key = ipKey("sign_up", "198.51.100.9");
    const rule = { limit: 1, windowSeconds: 1 };
    expect((await consumeRateLimit(key, rule)).allowed).toBe(true);
    expect((await consumeRateLimit(key, rule)).allowed).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect((await consumeRateLimit(key, rule)).allowed).toBe(true);
  });

  it("keeps accounts separate and never stores an email", async () => {
    const rule = { limit: 1, windowSeconds: 900 };
    expect((await consumeRateLimit(emailKey("sign_in", "a@example.test"), rule)).allowed).toBe(true);
    expect((await consumeRateLimit(emailKey("sign_in", "b@example.test"), rule)).allowed).toBe(true);
    expect(emailKey("sign_in", " A@Example.TEST ")).toBe(emailKey("sign_in", "a@example.test"));

    const keys = (await ctx.db.select({ key: rateLimit.key }).from(rateLimit)).map((row) => row.key);
    expect(keys.some((key) => key.includes("@"))).toBe(false);
  });

  it("reads the client address from the proxy header", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.9" }))).toBe("198.51.100.9");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
