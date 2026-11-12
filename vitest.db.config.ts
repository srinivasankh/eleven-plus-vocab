import "dotenv/config";
import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

// Integration tests against a real Postgres database (TEST_DATABASE_URL). They wipe it.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/db/**/*.test.ts"],
    fileParallelism: false,
    // Server code reads DATABASE_URL; point it at the test database. The dev URL is kept so
    // the helpers can refuse to run if both are the same database.
    env: {
      DEV_DATABASE_URL: process.env.DATABASE_URL ?? "",
      ...(process.env.TEST_DATABASE_URL ? { DATABASE_URL: process.env.TEST_DATABASE_URL } : {}),
    },
  },
});
