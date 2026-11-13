/**
 * Builds the app the way a host like Vercel may: with no database or auth secret available.
 * `next build` must never need them (all pages render on demand). Usage: npm run build:no-db
 */
import { spawnSync } from "node:child_process";

const env = { ...process.env, DATABASE_URL: "", BETTER_AUTH_SECRET: "" }; // empty beats .env (Next won't override set vars)
const result = spawnSync("npx", ["next", "build"], { env, stdio: "inherit", shell: process.platform === "win32" });
process.exit(result.status ?? 1);
