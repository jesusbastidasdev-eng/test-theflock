import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/**/*.ts"],
      exclude: ["src/server.ts", "src/load-env.ts", "**/*.d.ts"],
    },
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
