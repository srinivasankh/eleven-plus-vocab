import { describe, expect, it } from "vitest";
import { formatLogEntry, serializeError } from "@/server/log";

describe("structured logs", () => {
  it("writes one JSON object with time, level and event", () => {
    const line = formatLogEntry("info", "quiz.finished", { childId: "c1", score: 4 }, new Date("2026-11-13T00:00:00Z"));
    expect(JSON.parse(line)).toEqual({
      time: "2026-11-13T00:00:00.000Z",
      level: "info",
      event: "quiz.finished",
      childId: "c1",
      score: 4,
    });
  });

  it("redacts fields that look sensitive, even if passed by mistake", () => {
    const entry = JSON.parse(
      formatLogEntry("warn", "x", { password: "hunter2", email: "a@b.c", sessionToken: "t", cookie: "c", parentId: "p" }),
    );
    expect(entry).toMatchObject({ password: "[redacted]", email: "[redacted]", sessionToken: "[redacted]", cookie: "[redacted]", parentId: "p" });
  });

  it("serializes errors and non-errors", () => {
    expect(serializeError(new TypeError("boom"))).toMatchObject({ name: "TypeError", message: "boom" });
    expect(serializeError("plain")).toEqual({ message: "plain" });
  });
});
