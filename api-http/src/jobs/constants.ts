import type { Language } from "../schema/language.schema";
import type { JudgeLanguage } from "../schema/job.schema";

/**
 * Judge pipeline constants (Economy Service Phase 3).
 *
 * BullMQ queue names are gone — the submit path now runs through an in-process
 * pool (jobs/pool.ts) and runs execute inline (judge/runOnce.ts).
 */

/**
 * Which execution backend the judge pipeline uses (SELF_HOSTED_JUDGE.md §4.1).
 * `config/env.ts` validates this at boot; only "judge0" is implemented today.
 */
export const JUDGE_BACKEND = process.env.JUDGE_BACKEND ?? "judge0";

/** Judge0-only: how long to wait for an async submission to reach a terminal state. */
export const POLL_MAX_ATTEMPTS = 20;
export const POLL_INTERVAL_MS = 1500;

// Tuning knobs (Economy Service Phase 6). Read straight from process.env with
// sane defaults; config/env.ts validates them at boot so bad values fail fast.
export const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY ?? "4", 10);
/** Token-bucket rate limit for Judge0 calls (mirrors the old BullMQ limiter). */
export const JUDGE_RATE_MAX = parseInt(process.env.JUDGE_RATE_MAX ?? "10", 10);
export const JUDGE_RATE_WINDOW_MS = parseInt(process.env.JUDGE_RATE_WINDOW_MS ?? "1000", 10);
/** `/api/run`: max in-flight runs and the per-request timeout. */
export const RUN_MAX_CONCURRENCY = parseInt(process.env.RUN_MAX_CONCURRENCY ?? "8", 10);
export const RUN_TIMEOUT_MS = parseInt(process.env.RUN_TIMEOUT_MS ?? "35000", 10);

/**
 * Local backend limits (SELF_HOSTED_JUDGE.md Phase 3).
 *
 * The compile/run seconds are enforced INSIDE the container by GNU `timeout`,
 * which is what makes "compiler hung" and "user code looped" distinguishable.
 * The wall timeout is a Node-side backstop for the cases in-container limits
 * cannot cover — a wedged daemon, a stuck image pull, a container that never
 * starts — so it must comfortably exceed compile + run + startup.
 */
export const LOCAL_COMPILE_TIMEOUT_S = parseInt(process.env.LOCAL_COMPILE_TIMEOUT_S ?? "10", 10);
export const LOCAL_RUN_TIMEOUT_S = parseInt(process.env.LOCAL_RUN_TIMEOUT_S ?? "5", 10);
export const LOCAL_WALL_TIMEOUT_MS = parseInt(process.env.LOCAL_WALL_TIMEOUT_MS ?? "30000", 10);

/**
 * Max combined stdout+stderr bytes before the container is killed.
 *
 * `while(true) print(x)` must not fill the disk or balloon this Node process.
 * The harness emits a few dozen bytes per test case, so 1MB is roughly four
 * orders of magnitude of headroom over any legitimate submission.
 */
export const LOCAL_OUTPUT_CAP_BYTES = parseInt(process.env.LOCAL_OUTPUT_CAP_BYTES ?? "1048576", 10);

/**
 * Shadow mode (SELF_HOSTED_JUDGE.md Phase 5). Deliberately small: shadow work is
 * sampling, not accounting, and it shares a box with the API. Past
 * concurrency + queue depth, extra comparisons are dropped and counted rather
 * than buffered — a lower sample rate beats memory pressure on api-http.
 */
export const SHADOW_MAX_CONCURRENCY = parseInt(process.env.SHADOW_MAX_CONCURRENCY ?? "2", 10);
export const SHADOW_MAX_QUEUED = parseInt(process.env.SHADOW_MAX_QUEUED ?? "32", 10);

/** api-http uses "js" internally, but the judge vocabulary expects "javascript". */
export const LANGUAGE_TO_JUDGE_JOB: Record<Language, JudgeLanguage> = {
  cpp: "cpp",
  java: "java",
  js: "javascript",
  python: "python",
};

export const JUDGE0_LANGUAGE_MAP: Record<string, number> = {
  cpp: 54,
  python: 71,
  javascript: 63,
  java: 62,
};

export const JUDGE0_TERMINAL_STATUSES = new Set([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
