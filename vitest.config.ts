import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    // Database tests need Postgres; they run separately via `npm run test:db`.
    exclude: ["tests/db/**", "node_modules/**"],
    setupFiles: ["tests/setup.ts"],
  },
});
