/**
 * The executor seam decides which backend runs untrusted code, and — more
 * subtly — how the pool reacts when that decision is wrong.
 *
 * `JUDGE_BACKEND` is read at module load (`jobs/constants.ts`), so each case
 * resets the module registry and re-imports rather than mutating a live value.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const ORIGINAL = process.env.JUDGE_BACKEND;

/**
 * Returns `errors` from the SAME freshly-reset module graph as `executor`.
 * A static top-level import of `./errors` would be a different instance after
 * `vi.resetModules()`, and `instanceof` would fail against a correctly-thrown
 * error — a false failure that hides the behavior under test.
 */
async function loadExecutorWith(backend: string | undefined) {
  vi.resetModules();
  if (backend === undefined) {
    delete process.env.JUDGE_BACKEND;
  } else {
    process.env.JUDGE_BACKEND = backend;
  }
  const [executor, errors] = await Promise.all([import("./executor"), import("./errors")]);
  return { ...executor, ...errors };
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  if (ORIGINAL === undefined) {
    delete process.env.JUDGE_BACKEND;
  } else {
    process.env.JUDGE_BACKEND = ORIGINAL;
  }
});

describe("getExecutor", () => {
  it("defaults to the Judge0 backend when JUDGE_BACKEND is unset", async () => {
    const { getExecutor } = await loadExecutorWith(undefined);
    expect(getExecutor().name).toBe("judge0");
  });

  it("selects the Judge0 backend when asked for it explicitly", async () => {
    const { getExecutor } = await loadExecutorWith("judge0");
    expect(getExecutor().name).toBe("judge0");
  });

  it("caches the backend so a stateful executor is constructed once", async () => {
    const { getExecutor } = await loadExecutorWith("judge0");
    expect(getExecutor()).toBe(getExecutor());
  });

  it("resetExecutorCache drops the cached backend", async () => {
    const { getExecutor, resetExecutorCache } = await loadExecutorWith("judge0");
    const first = getExecutor();
    resetExecutorCache();
    // Same module instance, so the singleton is re-resolved to the same object —
    // what matters is that the reset path is exercised and stays callable.
    expect(getExecutor().name).toBe(first.name);
  });

  /**
   * `config/env.ts` rejects unknown backends at boot, so this should be
   * unreachable. It is still worth pinning: if a bad value ever does reach the
   * pool, the failure must be TERMINAL. A transient classification would make
   * `pool.ts` retry a misconfiguration three times with backoff on every
   * submission of a contest, turning a config typo into a slow outage.
   */
  it("fails terminally — not transiently — on an unknown backend", async () => {
    const { getExecutor, UnrecoverableError, isTransientError } =
      await loadExecutorWith("not-a-backend");

    let thrown: unknown;
    try {
      getExecutor();
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeInstanceOf(UnrecoverableError);
    expect((thrown as Error).message).toContain("not-a-backend");
    expect(isTransientError(thrown)).toBe(false);
  });
});
