/**
 * Contest work must outrank practice work in the shared judge pool
 * (PRACTICE_MODE_AND_NAVIGATION.md §4.3).
 *
 * Practice load is unbounded and continuous; contest load is bounded and has a
 * deadline riding on it. Both share one pool and one Judge0 token bucket, so if
 * this ordering regresses, a practice backlog silently delays contest verdicts —
 * a failure that would only show up under load, in production, during a contest.
 *
 * The judge pipeline and result writes are mocked: this is a DB-free unit test
 * of the scheduling policy alone.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const processed: string[] = [];
/** Resolvers for in-flight jobs, so a test controls when each one finishes. */
let release: Array<() => void> = [];

vi.mock("./submitProcessor", () => ({
  processSubmitJob: vi.fn((job: { jobId: string }) => {
    processed.push(job.jobId);
    return new Promise<void>((resolve) => release.push(resolve));
  }),
}));

vi.mock("../service/submissionResult.service", () => ({
  applyJobResult: vi.fn(),
}));

vi.mock("../lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  childLogger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { SubmitPool } from "./pool";
import type { JudgeJob } from "../schema/job.schema";

const contestJob = (jobId: string): JudgeJob => ({
  jobId,
  target: { kind: "contest", dsaSubmissionId: 1, attemptId: 1, contestId: 1 },
  userId: 1,
  problemId: 1,
  language: "python",
  sourceCode: "print(1)",
  totalTestCases: 1,
  totalPoints: 100,
});

const practiceJob = (jobId: string): JudgeJob => ({
  jobId,
  target: { kind: "practice", practiceSubmissionId: 1 },
  userId: 1,
  problemId: 1,
  language: "python",
  sourceCode: "print(1)",
  totalTestCases: 1,
  totalPoints: 100,
});

/** Let queued microtasks settle so the pool can drain. */
const tick = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  processed.length = 0;
  release = [];
  vi.clearAllMocks();
});

describe("SubmitPool — contest priority", () => {
  it("runs a queued contest job before practice jobs enqueued earlier", async () => {
    // Concurrency 1: one job runs, the rest queue, so ordering is observable.
    const pool = new SubmitPool(1);

    pool.enqueue(practiceJob("practice-1")); // starts immediately (pool was idle)
    pool.enqueue(practiceJob("practice-2")); // queues
    pool.enqueue(contestJob("contest-1")); // queues *behind* practice-2...
    await tick();

    expect(processed).toEqual(["practice-1"]);

    // ...but jumps it when a slot frees up.
    release[0]();
    await tick();

    expect(processed).toEqual(["practice-1", "contest-1"]);

    release[1]();
    await tick();

    expect(processed).toEqual(["practice-1", "contest-1", "practice-2"]);
  });

  it("keeps FIFO order within the contest queue", async () => {
    const pool = new SubmitPool(1);

    pool.enqueue(contestJob("contest-1"));
    pool.enqueue(contestJob("contest-2"));
    pool.enqueue(contestJob("contest-3"));
    await tick();

    release[0]();
    await tick();
    release[1]();
    await tick();

    expect(processed).toEqual(["contest-1", "contest-2", "contest-3"]);
  });

  it("still runs practice work when no contest work is queued", async () => {
    const pool = new SubmitPool(1);

    pool.enqueue(practiceJob("practice-1"));
    await tick();
    release[0]();
    await tick();

    expect(processed).toEqual(["practice-1"]);
  });

  it("tracks queue depth by kind", async () => {
    const pool = new SubmitPool(1);

    pool.enqueue(contestJob("contest-1")); // runs
    pool.enqueue(contestJob("contest-2")); // queued
    pool.enqueue(practiceJob("practice-1")); // queued
    pool.enqueue(practiceJob("practice-2")); // queued
    await tick();

    expect(pool.queueDepth).toEqual({ contest: 1, practice: 2 });
    expect(pool.inFlight).toBe(4);
  });

  it("does not accept new work once closed", async () => {
    const pool = new SubmitPool(1);
    await pool.close(0);

    pool.enqueue(contestJob("contest-1"));
    await tick();

    // Left `pending` in the DB for the boot reconciler rather than run.
    expect(processed).toEqual([]);
  });
});
