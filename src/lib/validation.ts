import { z } from "zod";

export const MAX_CHILDREN = 6;

const email = z.string().trim().toLowerCase().email("Please enter a valid email address.").max(254);

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Please enter your password.").max(128),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(60, "That name is a bit long."),
  email,
  password: z
    .string()
    .min(8, "Passwords need at least 8 characters.")
    .max(128, "Passwords can be at most 128 characters."),
});

export const childNameSchema = z
  .string()
  .trim()
  .min(1, "Please enter a name.")
  .max(30, "Names can be at most 30 characters.")
  .regex(/^[\p{L}\p{N} '’.-]+$/u, "Use letters, numbers, spaces, apostrophes or hyphens.");

export const childIdSchema = z.string().uuid();

export const quizLengthSchema = z.union([z.literal(5), z.literal(10), z.literal(20)]);

export const setLearnedSchema = z.object({
  wordId: z.number().int().positive(),
  learned: z.boolean(),
});

export const answerSchema = z.object({
  attemptId: z.string().uuid(),
  position: z.number().int().min(0).max(19),
  chosenIndex: z.number().int().min(0).max(3),
});
/**
 * Only allow redirects to a path on this site ("/quiz"), never to another origin
 * ("//evil.example", "https://…") — otherwise sign-in links could be used for phishing.
 */
export function safeNextPath(value: unknown, fallback = "/profiles"): string {
  if (typeof value !== "string" || value.length > 512) return fallback;
  // Browsers silently strip tabs/newlines and treat "\\" like "/", so "/\t/evil.example" or
  // "/\\evil.example" would become "//evil.example". Reject them outright.
  if (/[\u0000-\u001F\u007F\\]/.test(value)) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;

  // Belt and braces: resolve it the way a browser would and require the same origin.
  const base = "http://same-site.invalid";
  try {
    const url = new URL(value, base);
    if (url.origin !== base) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

/**
 * Where to send a learner after picking a profile: a safe same-site path, but never back to the
 * account pages themselves (which would loop).
 */
export function learnerNextPath(value: unknown): string {
  const path = safeNextPath(value, "/learn");
  return /^\/(profiles|sign-in|sign-up|api)(\/|\?|$)/.test(path) ? "/learn" : path;
}

/** First error message per field, for showing next to form inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}

/** Server-side check of an import request (the browser already filtered it; never trust that). */
export const legacyProgressSchema = z.object({
  learnedWordIds: z.array(z.number().int().positive()).max(2000),
  quizHistory: z
    .array(
      z
        .object({
          ts: z.string().datetime(),
          score: z.number().int().min(0),
          total: quizLengthSchema,
        })
        .refine((item) => item.score <= item.total)
        .refine((item) => Date.parse(item.ts) <= Date.now() + 24 * 60 * 60 * 1000),
    )
    .max(500),
});

