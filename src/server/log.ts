/**
 * Structured server logs: one JSON object per line, so a host's log viewer can filter by
 * `event` or `level`. Never pass passwords, emails or other personal data in `fields` —
 * log ids (child id, attempt id) instead.
 */

export type LogLevel = "info" | "warn" | "error";

type Fields = Record<string, unknown>;

const SENSITIVE_KEYS = /pass(word)?|secret|token|cookie|authorization|email/i;

export function serializeError(error: unknown): Fields {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...(process.env.NODE_ENV === "production" ? {} : { stack: error.stack }),
    };
  }
  return { message: String(error) };
}

/** Builds the log line. Exported for tests. Sensitive-looking keys are redacted defensively. */
export function formatLogEntry(level: LogLevel, event: string, fields: Fields = {}, now = new Date()): string {
  const safe: Fields = {};
  for (const [key, value] of Object.entries(fields)) {
    safe[key] = SENSITIVE_KEYS.test(key) ? "[redacted]" : value;
  }
  return JSON.stringify({ time: now.toISOString(), level, event, ...safe });
}

function write(level: LogLevel, event: string, fields?: Fields) {
  const line = formatLogEntry(level, event, fields);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  info: (event: string, fields?: Fields) => write("info", event, fields),
  warn: (event: string, fields?: Fields) => write("warn", event, fields),
  error: (event: string, error: unknown, fields?: Fields) =>
    write("error", event, { ...fields, error: serializeError(error) }),
};
