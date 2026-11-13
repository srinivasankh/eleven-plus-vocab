import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { account, user } from "@/server/db/schema";
import { resetTestDatabase } from "./helpers";

// The nextCookies plugin writes cookies through next/headers, which needs a request.
// Outside Next (in tests) give it a no-op cookie store.
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
  headers: async () => new Headers(),
}));

let ctx: Awaited<ReturnType<typeof resetTestDatabase>>;

beforeAll(async () => {
  ctx = await resetTestDatabase();
});

afterAll(async () => {
  await ctx.close();
});

describe("parent accounts (Better Auth)", () => {
  it("signs up, stores a hashed password, signs in, and rejects a wrong password", async () => {
    const { getAuth } = await import("@/server/auth");
    const api = getAuth().api;

    const created = await api.signUpEmail({
      body: { name: "Pat", email: "pat@example.test", password: "correct-horse-battery" },
    });
    expect(created.user.email).toBe("pat@example.test");

    const [stored] = await ctx.db.select().from(account).where(eq(account.userId, created.user.id));
    expect(stored.password).toBeTruthy();
    expect(stored.password).not.toContain("correct-horse-battery");

    const signedIn = await api.signInEmail({
      body: { email: "pat@example.test", password: "correct-horse-battery" },
    });
    expect(signedIn.token).toBeTruthy();

    await expect(
      api.signInEmail({ body: { email: "pat@example.test", password: "wrong-password-1" } }),
    ).rejects.toMatchObject({ body: { code: "INVALID_EMAIL_OR_PASSWORD" } });

    await expect(
      api.signUpEmail({ body: { name: "Pat again", email: "pat@example.test", password: "another-pass-1" } }),
    ).rejects.toMatchObject({ status: expect.anything() });

    expect(await ctx.db.select().from(user)).toHaveLength(1);
  });

  it("applies the app's name rules even through Better Auth's own endpoints", async () => {
    // Found in review: /api/auth/sign-up/email accepted a blank and a 5,000-character name.
    const { getAuth } = await import("@/server/auth");
    const api = getAuth().api;

    for (const name of ["   ", "x".repeat(5000)]) {
      await expect(
        api.signUpEmail({ body: { name, email: `bad-${name.length}@example.test`, password: "correct-horse-battery" } }),
      ).rejects.toMatchObject({ status: "BAD_REQUEST" });
    }

    const created = await api.signUpEmail({
      body: { name: "  Sam  ", email: "sam@example.test", password: "correct-horse-battery" },
    });
    expect(created.user.name).toBe("Sam"); // trimmed, like the form
    expect(await ctx.db.select().from(user)).toHaveLength(2);
  });
});
