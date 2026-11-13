import { describe, expect, it } from "vitest";
import { formatLogEntry, scrubText, serializeError } from "@/server/log";

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

  it("never logs the parameters of a failed database query", () => {
    // Found in review: Drizzle puts the SQL parameters (here, an email) in the error message.
    const dbError = new Error('Failed query: select "id" from "user" where "email" = $1\nparams: pat@example.test', {
      cause: Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:5432"), { code: "ECONNREFUSED" }),
    });
    const fields = serializeError(dbError);
    expect(fields).toEqual({ name: "Error", message: "Database query failed", code: "ECONNREFUSED", cause: "Error" });
    expect(JSON.stringify(fields)).not.toContain("pat@example.test");
  });

  it("masks email addresses anywhere in a log line as a last line of defence", () => {
    const line = formatLogEntry("error", "x", { note: "user pat.smith+kids@example.co.uk failed", error: serializeError(new Error("bad pat@example.test")) });
    expect(line).not.toMatch(/@example/);
    expect(line).toContain("[email]");
    expect(scrubText("no address here, just @mentions and a@b")).toBe("no address here, just @mentions and a@b");
  });
});

