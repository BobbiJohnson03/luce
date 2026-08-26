import { defineConfig } from "vitest/config";

// Deterministic unit tests for the SRS scheduler and review queue. Kept
// intentionally small: no browser stack, no coverage tooling. Only the pure,
// framework-free logic under src/lib/languages/srs is exercised here.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
