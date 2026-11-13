import { describe, expect, it } from "vitest";
import {
  FALLBACK_PARENT_NAME,
  googleCredentials,
  googleErrorMessage,
  isOAuthCallbackPath,
  nameFromProvider,
} from "@/lib/googleAuth";
import { afterSignInPath } from "@/lib/validation";

describe("googleCredentials", () => {
  it("is off unless both values are set", () => {
    expect(googleCredentials({})).toBeNull();
    expect(googleCredentials({ GOOGLE_CLIENT_ID: "id" })).toBeNull();
    expect(googleCredentials({ GOOGLE_CLIENT_ID: " ", GOOGLE_CLIENT_SECRET: "secret" })).toBeNull();
    expect(googleCredentials({ GOOGLE_CLIENT_ID: " id ", GOOGLE_CLIENT_SECRET: "secret\n" })).toEqual({
      clientId: "id",
      clientSecret: "secret",
    });
  });
});

describe("nameFromProvider", () => {
  it("keeps a normal name, tidying spaces", () => {
    expect(nameFromProvider("  Asha   Patel ")).toBe("Asha Patel");
  });
  it("falls back when Google gives no name", () => {
    expect(nameFromProvider("")).toBe(FALLBACK_PARENT_NAME);
    expect(nameFromProvider("   ")).toBe(FALLBACK_PARENT_NAME);
    expect(nameFromProvider(undefined)).toBe(FALLBACK_PARENT_NAME);
  });
  it("shortens long names to 60 characters without splitting emoji", () => {
    expect(nameFromProvider("a".repeat(200))).toHaveLength(60);
    const emoji = nameFromProvider("😀".repeat(70));
    expect(Array.from(emoji)).toHaveLength(60);
  });
});

describe("isOAuthCallbackPath", () => {
  it("matches only Better Auth's OAuth callback", () => {
    expect(isOAuthCallbackPath("/callback/google")).toBe(true);
    expect(isOAuthCallbackPath("/sign-up/email")).toBe(false);
    expect(isOAuthCallbackPath("/update-user")).toBe(false);
    expect(isOAuthCallbackPath(undefined)).toBe(false);
  });
});

describe("googleErrorMessage", () => {
  it("explains the expected failures and hides unknown codes", () => {
    expect(googleErrorMessage(undefined)).toBeNull();
    expect(googleErrorMessage("account_not_linked")).toMatch(/email and password/);
    expect(googleErrorMessage("access_denied")).toMatch(/cancelled/);
    expect(googleErrorMessage("<script>")).toBe("Google sign-in didn't work this time. Please try again.");
  });
});

describe("afterSignInPath", () => {
  it("always goes through the learner picker", () => {
    expect(afterSignInPath(null)).toBe("/profiles");
    expect(afterSignInPath("/learn")).toBe("/profiles");
    expect(afterSignInPath("/quiz?mode=resume")).toBe("/profiles?next=%2Fquiz%3Fmode%3Dresume");
  });
  it("never loops back to sign-in or the Google landing route, or leaves the site", () => {
    expect(afterSignInPath("/auth/continue")).toBe("/profiles");
    expect(afterSignInPath("/sign-in")).toBe("/profiles");
    expect(afterSignInPath("https://evil.example/")).toBe("/profiles");
    expect(afterSignInPath("//evil.example")).toBe("/profiles");
  });
});
