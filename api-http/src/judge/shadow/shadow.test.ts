/**
 * Shadow mode has exactly two safety properties, and both are easy to break by
 * accident with an innocent-looking `await`:
 *
 *   1. it can never change a verdict;
 *   2. it can never slow a submission down.
 *
 * These tests exist because a regression in either is invisible in production —
 * verdicts would still look plausible, latency would just quietly get worse.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createShadowExecutor, shadowStats, resetShadowStats } from "./index";
import type { Executor } from "../executor";
import type { Judge0StatusResponse } from "../../schema/judge0.schema";

vi.mock("../../lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
  childLogger: () => ({ warn: vi.fn(), info: vi.fn(), error: vi.fn() }),
}));

function result(stdout: string, statusId = 3): Judge0StatusResponse {
  return {
    token: "t",
    status: { id: statusId, description: "d" },
    stdout,
    stderr: null,
    compile_output: null,
    time: "0.1",
    memory: null,
  };
}

const PASSING = "__CASE__0\n__PASS__\n";

function fakeExecutor(name: string, impl: () => Promise<Judge0StatusResponse>): Executor {
  return { name, execute: impl };
}

/** Lets the un-awaited candidate work drain before assertions. */
const flush = () => new Promise((r) => setTimeout(r, 20));

beforeEach(() => {
  resetShadowStats();
});

describe("shadow mode safety", () => {
  it("returns the reference result, not the candidate's", async () => {
    const shadow = createShadowExecutor(
      fakeExecutor("ref", async () => result(PASSING)),
      fakeExecutor("cand", async () => result("__CASE__0\n__FAIL__\n"))
    );

    const res = await shadow.execute({ language: "python", sourceCode: "x" });
    expect(res.stdout).toBe(PASSING);
    await flush();
  });

  it("returns the reference result even when the candidate throws", async () => {
    const shadow = createShadowExecutor(
      fakeExecutor("ref", async () => result(PASSING)),
      fakeExecutor("cand", async () => {
        throw new Error("docker is on fire");
      })
    );

    const res = await shadow.execute({ language: "python", sourceCode: "x" });
    expect(res.stdout).toBe(PASSING);

    await flush();
    expect(shadowStats().failed).toBe(1);
  });

  /**
   * The property most likely to regress: someone adds `await` to the candidate
   * call for "cleaner" error handling and every submission silently starts
   * paying the container's latency on top of Judge0's.
   */
  it("does not wait for the candidate before returning", async () => {
    let candidateFinished = false;
    const shadow = createShadowExecutor(
      fakeExecutor("ref", async () => result(PASSING)),
      fakeExecutor("cand", async () => {
        await new Promise((r) => setTimeout(r, 200));
        candidateFinished = true;
        return result(PASSING);
      })
    );

    await shadow.execute({ language: "python", sourceCode: "x" });
    expect(candidateFinished).toBe(false);

    await new Promise((r) => setTimeout(r, 300));
    expect(candidateFinished).toBe(true);
  });

  it("counts matches and divergences", async () => {
    const shadow = createShadowExecutor(
      fakeExecutor("ref", async () => result(PASSING)),
      fakeExecutor("cand", async () => result("__CASE__0\n__FAIL__\n"))
    );

    await shadow.execute({ language: "python", sourceCode: "x" });
    await flush();

    expect(shadowStats().compared).toBe(1);
    expect(shadowStats().diverged).toBe(1);
  });

  it("does not count a divergence when the backends agree", async () => {
    const shadow = createShadowExecutor(
      fakeExecutor("ref", async () => result(PASSING)),
      fakeExecutor("cand", async () => result(PASSING))
    );

    await shadow.execute({ language: "python", sourceCode: "x" });
    await flush();

    expect(shadowStats()).toMatchObject({ compared: 1, diverged: 0 });
  });

  /**
   * Shadow work is sampling, not accounting. If the candidate cannot keep up,
   * dropping comparisons is correct and buffering them is not — an unbounded
   * queue on the API process is a memory leak wearing a helpful hat.
   */
  it("drops shadow work rather than queueing without bound", async () => {
    let release!: () => void;
    const blocked = new Promise<void>((r) => (release = r));

    const shadow = createShadowExecutor(
      fakeExecutor("ref", async () => result(PASSING)),
      fakeExecutor("cand", async () => {
        await blocked;
        return result(PASSING);
      })
    );

    // Far more than SHADOW_MAX_CONCURRENCY (2) + SHADOW_MAX_QUEUED (32).
    const results = await Promise.all(
      Array.from({ length: 100 }, () => shadow.execute({ language: "python", sourceCode: "x" }))
    );

    // Every caller still got a correct verdict.
    expect(results.every((r) => r.stdout === PASSING)).toBe(true);
    expect(shadowStats().dropped).toBeGreaterThan(0);

    release();
    await flush();
  });

  it("names itself with both backends so logs say which pairing ran", async () => {
    const shadow = createShadowExecutor(
      fakeExecutor("judge0", async () => result(PASSING)),
      fakeExecutor("local", async () => result(PASSING))
    );
    expect(shadow.name).toBe("shadow(judge0->local)");
  });
});
