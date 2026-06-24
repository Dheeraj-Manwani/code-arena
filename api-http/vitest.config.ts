import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Unit tests only — they must not require a DB, Redis, or network.
    // Anything that imports Prisma/ioredis should be excluded from this scope.
  },
});
