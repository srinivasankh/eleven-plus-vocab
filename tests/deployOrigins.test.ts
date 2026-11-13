import { describe, expect, it } from "vitest";
import { authBaseUrl, directDatabaseUrl, previewOrigins } from "@/lib/deployOrigins";

describe("deployment origins for sign-in", () => {
  it("uses BETTER_AUTH_URL in production and trusts nothing extra", () => {
    const env = { VERCEL_ENV: "production", BETTER_AUTH_URL: "https://vocab.kanniwadi.uk", VERCEL_URL: "x.vercel.app" };
    expect(authBaseUrl(env)).toBe("https://vocab.kanniwadi.uk");
    expect(previewOrigins(env)).toEqual([]);
  });

  it("trusts exactly this preview's own addresses — never a wildcard", () => {
    const env = {
      VERCEL_ENV: "preview",
      VERCEL_BRANCH_URL: "eleven-plus-vocab-git-claude-back-399b44-srinivasankhs-projects.vercel.app",
      VERCEL_URL: "eleven-plus-vocab-abc123-srinivasankhs-projects.vercel.app",
    };
    expect(previewOrigins(env)).toEqual([
      "https://eleven-plus-vocab-git-claude-back-399b44-srinivasankhs-projects.vercel.app",
      "https://eleven-plus-vocab-abc123-srinivasankhs-projects.vercel.app",
    ]);
    expect(authBaseUrl(env)).toBe(previewOrigins(env)[0]);
    expect(previewOrigins(env).some((origin) => origin.includes("*"))).toBe(false);
  });

  it("ignores malformed host values and works locally with nothing set", () => {
    expect(previewOrigins({ VERCEL_ENV: "preview", VERCEL_URL: "evil.example/path?x" })).toEqual([]);
    expect(authBaseUrl({})).toBeUndefined();
  });

  it("prefers the direct database connection for migrations", () => {
    expect(directDatabaseUrl({ DATABASE_URL: "pooled", DATABASE_URL_UNPOOLED: "direct" })).toBe("direct");
    expect(directDatabaseUrl({ DATABASE_URL: "pooled" })).toBe("pooled");
  });
});
