import { afterEach, describe, expect, it, vi } from "vitest";
import { activeQuizKey, loadActiveQuiz, sanitizeActiveQuiz, saveActiveQuiz } from "@/lib/storage";

const quiz = { questionIndex: 2, answers: [0, 1, -1], questionIds: ["q-10", "q-11", "q-12"] };

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("sanitizeActiveQuiz", () => {
  it("rejects malformed values", () => {
    expect(sanitizeActiveQuiz("bad")).toBeUndefined();
    expect(sanitizeActiveQuiz({ questionIndex: "2", answers: [], questionIds: [] })).toBeUndefined();
  });

  it("keeps a valid quiz and drops bad array items", () => {
    expect(sanitizeActiveQuiz({ ...quiz, answers: [0, "x", 1] })).toEqual({ ...quiz, answers: [0, 1] });
  });
});

describe("active quiz storage", () => {
  it("is stored separately for each child", () => {
    saveActiveQuiz("child-a", quiz);
    expect(loadActiveQuiz("child-a")).toEqual(quiz);
    expect(loadActiveQuiz("child-b")).toBeUndefined();

    saveActiveQuiz("child-a", undefined);
    expect(window.localStorage.getItem(activeQuizKey("child-a"))).toBeNull();
  });

  it("never throws when the browser blocks storage", () => {
    const blocked = () => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    };
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(blocked);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(blocked);
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(blocked);

    expect(() => saveActiveQuiz("child-a", quiz)).not.toThrow();
    expect(() => saveActiveQuiz("child-a", undefined)).not.toThrow();
    expect(loadActiveQuiz("child-a")).toBeUndefined();
  });
});
