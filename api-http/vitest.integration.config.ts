import { defineConfig } from "vitest/config";

/**
 * Integration tests — these DO require a live Postgres, which is exactly why
 * they are a separate project from `vitest.config.ts`. That config promises its
 * suite is DB-free and stays fast; loosening it to fit these would cost the
 * whole test suite that guarantee.
 *
 * Run with `npm run test:integration`. Point `TEST_DATABASE_URL` at a scratch
 * database — the suite truncates the tables it touches.
 *
 * Set `DATABASE_URL` to the same value. Suites that exercise repository
 * functions go through the shared client in `src/lib/db.ts`, which reads
 * `DATABASE_URL` and would otherwise write to your development database. The
 * suites assert this themselves and refuse to run when the two disagree.
 *
 * These exist because the bugs that actually shipped in this codebase were
 * invisible to mocked-Prisma unit tests: a `pg_advisory_xact_lock(...::bigint)`
 * that matched no Postgres function, and an `express-rate-limit` key generator
 * that threw only on IPv6 (PRACTICE_MODE_AND_NAVIGATION.md §5 verification).
 * Constraints are in the same category — a CHECK constraint that was never
 * exercised against a real server is a comment.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.itest.ts", "prisma/**/*.itest.ts"],
    // Schema-level tests share one database; running them in parallel makes
    // failures depend on interleaving rather than on the constraint under test.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
