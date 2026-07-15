import type { Language } from "../schema/language.schema";

/**
 * Judge pipeline constants (Economy Service Phase 3).
 *
 * BullMQ queue names are gone — the submit path now runs through an in-process
 * pool (jobs/pool.ts) and runs execute inline (judge/runOnce.ts).
 */
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

/** api-http uses "js" internally, but Judge0 job payloads expect "javascript". */
export const LANGUAGE_TO_JUDGE_JOB: Record<Language, "cpp" | "python" | "javascript" | "java"> = {
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
