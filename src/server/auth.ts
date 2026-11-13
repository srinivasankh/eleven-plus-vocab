import "server-only";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/server/db";
import { account, session, user, verification } from "@/server/db/schema";
import { authBaseUrl, previewOrigins } from "@/lib/deployOrigins";
import { parentNameSchema } from "@/lib/validation";
import { log, serializeError } from "@/server/log";

/**
 * The app's forms validate names, but Better Auth's own endpoints (/api/auth/sign-up/email,
 * /api/auth/update-user) don't go through them (found in review: a blank and a 5,000-character
 * name were accepted). Apply the same rule wherever a user is written.
 */
function checkedName(name: unknown): string {
  const parsed = parentNameSchema.safeParse(name);
  if (!parsed.success) {
    throw new APIError("BAD_REQUEST", { message: parsed.error.issues[0]?.message ?? "Invalid name." });
  }
  return parsed.data;
}

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

function createAuth() {
  return betterAuth({
    appName: "WordSpark",
    // BETTER_AUTH_SECRET is read from the environment. The base URL is BETTER_AUTH_URL in
    // production, or this preview deployment's own address on Vercel previews.
    baseURL: authBaseUrl(process.env),
    trustedOrigins: previewOrigins(process.env),
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: { user, session, account, verification },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: PASSWORD_MIN,
      maxPasswordLength: PASSWORD_MAX,
      autoSignIn: true,
    },
    databaseHooks: {
      user: {
        create: {
          before: async (newUser) => ({ data: { ...newUser, name: checkedName(newUser.name) } }),
        },
        update: {
          before: async (changes) =>
            changes.name === undefined ? { data: changes } : { data: { ...changes, name: checkedName(changes.name) } },
        },
      },
    },
    // Route Better Auth's own logs through ours, so errors it logs (which can include query
    // parameters such as emails) get the same scrubbing.
    logger: {
      log: (level, message, ...args) => {
        const fields = { detail: args.map((arg) => (arg instanceof Error ? serializeError(arg) : "[omitted]")) };
        const event = `better_auth.${level}`;
        if (level === "error") log.error(event, new Error(message), fields);
        else if (level === "warn") log.warn(event, { message, ...fields });
        else log.info(event, { message, ...fields });
      },
    },
    // nextCookies must be last: it lets server actions set the session cookie.
    plugins: [nextCookies()],
  });
}

type Auth = ReturnType<typeof createAuth>;

let auth: Auth | undefined;

/** Lazily created so `next build` never needs a database or secret. */
export function getAuth(): Auth {
  auth ??= createAuth();
  return auth;
}
