import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/server/db";
import { account, session, user, verification } from "@/server/db/schema";

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

function createAuth() {
  return betterAuth({
    appName: "WordSpark",
    // BETTER_AUTH_SECRET and BETTER_AUTH_URL are read from the environment.
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
