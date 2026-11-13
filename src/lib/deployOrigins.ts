/**
 * The public origins this deployment answers on, for sign-in's origin check.
 *
 * Production: BETTER_AUTH_URL (https://vocab.kanniwadi.uk), set on the host.
 * Vercel preview deployments get unique addresses, so instead of a wildcard (never trust
 * "*.vercel.app") they trust exactly the two addresses Vercel gives *this* deployment:
 * the branch address (VERCEL_BRANCH_URL) and the deployment address (VERCEL_URL).
 */
export function previewOrigins(env: Record<string, string | undefined>): string[] {
  if (env.VERCEL_ENV !== "preview") return [];
  return [env.VERCEL_BRANCH_URL, env.VERCEL_URL]
    .filter((host): host is string => Boolean(host && /^[a-z0-9.-]+$/i.test(host)))
    .map((host) => `https://${host}`);
}

export function authBaseUrl(env: Record<string, string | undefined>): string | undefined {
  return env.BETTER_AUTH_URL || previewOrigins(env)[0];
}

/** Migrations and seeding use Neon's direct connection when available; the app uses the pooled one. */
export function directDatabaseUrl(env: Record<string, string | undefined>): string | undefined {
  return env.DATABASE_URL_UNPOOLED || env.DATABASE_URL;
}
