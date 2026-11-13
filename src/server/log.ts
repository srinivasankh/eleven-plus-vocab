/**
 * Structured server logs: one JSON object per line, so a host's log viewer can filter by
 * `event` or `level`. Never pass passwords, emails or other personal data in `fields` —
 * log ids (child id, attempt id) instead.
 */

export type LogLevel = "info" | "warn" | "error";

type Fields = Record<string, unknown>;

const SENSITIVE_KEYS = /pass(word)?|secret|token|cookie|authorization|email/i;

const EMAIL = /[^\s@"'<>()[\],;:]+@[^\s@"'<>()[\],;:]+\.[^\s@"'<>()[\],;:]+/g;

/** Masks anything shaped like an email address. A last line of defence, not a substitute for not logging it. */
export function scrubText(text: string): string {
  return text.replace(EMAIL, "[email]");
}

/**
 * Error → loggable fields, without personal data. Database errors from Drizzle carry the SQL
 * and its parameters in `message` ("Failed query: … params: pat@example.com,…"), so for those
 * only the driver's error code/type is kept. Found in review: a sign-in during a database
 * outage logged the parent's email.
 */
export function serializeError(error: unknown): Fields {
  if (!(error instanceof Error)) return { message: scrubText(String(error)) };

  const cause = error.cause as { code?: unknown; name?: unknown; message?: unknown } | undefined;
  if (error.message.startsWith("Failed query")) {
    return {
      name: error.name,
      message: "Database query failed",
      ...(cause?.code ? { code: String(cause.code) } : {}),
      ...(typeof cause?.name === "string" ? { cause: cause.name } : {}),
    };
  }

  return {
    name: error.name,
    message: scrubText(error.message),
    ...(process.env.NODE_ENV === "production" || !error.stack ? {} : { stack: scrubText(error.stack) }),
  };
}

/** Builds the log line. Exported for tests. Sensitive-looking keys are redacted defensively. */
export function formatLogEntry(level: LogLevel, event: string, fields: Fields = {}, now = new Date()): string {
  const safe: Fields = {};
  for (const [key, value] of Object.entries(fields)) {
    safe[key] = SENSITIVE_KEYS.test(key) ? "[redacted]" : value;
  }
  return scrubText(JSON.stringify({ time: now.toISOString(), level, event, ...safe }));
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
