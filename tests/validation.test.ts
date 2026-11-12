import { describe, expect, it } from "vitest";
import { childNameSchema, fieldErrors, learnerNextPath, safeNextPath, signUpSchema } from "@/lib/validation";

describe("safeNextPath", () => {
  it("keeps same-site paths", () => {
    expect(safeNextPath("/quiz")).toBe("/quiz");
    expect(safeNextPath("/quiz?mode=resume")).toBe("/quiz?mode=resume");
  });

  it("rejects anything that could leave the site", () => {
    for (const value of ["//evil.example", "https://evil.example", "/\\evil.example", "evil", "", undefined, 42]) {
      expect(safeNextPath(value)).toBe("/profiles");
    }
  });
});

describe("learnerNextPath", () => {
  it("continues to learner pages but never loops back to account pages", () => {
    expect(learnerNextPath("/quiz?mode=resume")).toBe("/quiz?mode=resume");
    expect(learnerNextPath("/progress")).toBe("/progress");
    for (const value of ["/profiles", "/profiles?next=/quiz", "/sign-in", "/sign-up", "/api/auth/x", "//evil", undefined]) {
      expect(learnerNextPath(value)).toBe("/learn");
    }
    expect(learnerNextPath("/profilesque")).toBe("/profilesque");
  });
});

describe("childNameSchema", () => {
  it("accepts friendly names and trims them", () => {
    expect(childNameSchema.parse("  Asha ")).toBe("Asha");
    expect(childNameSchema.parse("Zoë O'Neil-Smith")).toBe("Zoë O'Neil-Smith");
  });

  it("rejects empty, long or markup-like names", () => {
    expect(childNameSchema.safeParse("   ").success).toBe(false);
    expect(childNameSchema.safeParse("x".repeat(31)).success).toBe(false);
    expect(childNameSchema.safeParse("<script>").success).toBe(false);
  });
});

describe("signUpSchema", () => {
  it("normalises email and reports per-field errors", () => {
    expect(signUpSchema.parse({ name: "Sam", email: " Sam@Example.COM ", password: "longenough" }).email).toBe(
      "sam@example.com",
    );

    const result = signUpSchema.safeParse({ name: "", email: "nope", password: "short" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.keys(fieldErrors(result.error)).sort()).toEqual(["email", "name", "password"]);
    }
  });
});

describe("progress inputs", async () => {
  const { answerSchema, quizLengthSchema, setLearnedSchema } = await import("@/lib/validation");
  const attemptId = "6f1c2b9e-1d7a-4c39-9a51-3c8f0b1e2d44";

  it("accepts only real quiz lengths and answer positions", () => {
    expect(quizLengthSchema.safeParse(10).success).toBe(true);
    expect(quizLengthSchema.safeParse(7).success).toBe(false);
    expect(answerSchema.safeParse({ attemptId, position: 0, chosenIndex: 3 }).success).toBe(true);
    expect(answerSchema.safeParse({ attemptId, position: 0, chosenIndex: 4 }).success).toBe(false);
    expect(answerSchema.safeParse({ attemptId, position: 20, chosenIndex: 0 }).success).toBe(false);
    expect(answerSchema.safeParse({ attemptId: "not-a-uuid", position: 0, chosenIndex: 0 }).success).toBe(false);
  });

  it("validates learned toggles", () => {
    expect(setLearnedSchema.safeParse({ wordId: 12, learned: true }).success).toBe(true);
    expect(setLearnedSchema.safeParse({ wordId: "12", learned: true }).success).toBe(false);
    expect(setLearnedSchema.safeParse({ wordId: 0, learned: true }).success).toBe(false);
  });
});
