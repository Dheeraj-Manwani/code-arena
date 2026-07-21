import { JUDGE_BACKEND } from "../jobs/constants";
import { UnrecoverableError } from "./errors";
import { judge0Executor } from "./judge0";
import { localExecutor } from "./local";
import { shadowExecutor } from "./shadow";
import type { JudgeLanguage } from "../schema/job.schema";
import type { Judge0StatusResponse } from "../schema/judge0.schema";

/**
 * The single seam between "what to execute" and "where it executes"
 * (SELF_HOSTED_JUDGE.md §4.1).
 *
 * Everything the platform needs from an execution backend is one call: compile
 * and run ONE self-contained source file, with no stdin, and report what
 * happened. The generated harness (`util/boilerplate`) bakes the test cases AND
 * the expected outputs into that file and prints __PASS__/__FAIL__ markers, so
 * the backend never sees a test case and never diffs anything.
 *
 * ## Why the return type is still a Judge0 shape
 *
 * `Judge0StatusResponse` — numeric status ids and all — is deliberately kept as
 * the *internal* contract through the migration. `deriveVerdict` (`parse.ts`),
 * `run.service`, and the `judge0.schema.ts` copies in web-user and web-admin all
 * speak it today. Keeping it confines the local-backend diff to this folder
 * instead of rippling into three packages while verdict correctness is still
 * unproven. It is a crutch with a scheduled removal: Phase 7 replaces it with a
 * native vocabulary once Judge0 is gone.
 */

export interface ExecutionRequest {
  /** Judge-side language vocabulary ("javascript", not the app's "js"). */
  language: JudgeLanguage;
  /** A complete, self-contained program — harness and user code already merged. */
  sourceCode: string;
}

export interface Executor {
  /** For logs and the Phase 5 shadow-mode divergence reports. */
  readonly name: string;
  execute(req: ExecutionRequest): Promise<Judge0StatusResponse>;
}

/**
 * Cached because a backend may own process-lifetime resources (the local
 * backend's workspace root, for one). `config/env.ts` validates JUDGE_BACKEND at
 * boot, so the throw below is a belt-and-braces guard rather than the real
 * check — but it is an `UnrecoverableError` so that if a bad value ever does
 * reach the pool, the job fails fast instead of retrying three times.
 */
let cached: Executor | undefined;

export function getExecutor(): Executor {
  if (cached) {
    return cached;
  }

  switch (JUDGE_BACKEND) {
    case "judge0":
      cached = judge0Executor;
      return cached;
    case "local":
      cached = localExecutor;
      return cached;
    case "shadow":
      cached = shadowExecutor;
      return cached;
    default:
      throw new UnrecoverableError(`Unknown JUDGE_BACKEND: ${JUDGE_BACKEND}`);
  }
}

/** Test seam — drops the cached backend so a test can swap JUDGE_BACKEND. */
export function resetExecutorCache(): void {
  cached = undefined;
}
