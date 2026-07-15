import { enqueueSubmitJob } from "./submitQueue";
import * as submissionRepo from "../repositories/submission.repository";
import { logger } from "../lib/logger";
import type { BoilerplateSignature } from "../util/boilerplate/types";
import type { Language } from "../schema/language.schema";

/**
 * Boot-time durability sweep (Economy Service Phase 3).
 *
 * The in-process pool has no persistence, so if the process died mid-judge the
 * submission is left `status = "pending"`. On startup the pool is empty and
 * nothing else is judging, so every `pending` DSA submission is by definition
 * orphaned — re-enqueue them. Terminal failures are recorded as `runtime_error`
 * (see jobs/pool.ts), so they don't reappear here on every restart.
 */
export async function reconcilePendingSubmissions(): Promise<void> {
  const pending = await submissionRepo.getPendingDsaSubmissionsWithProblem();
  if (pending.length === 0) {
    return;
  }

  logger.info({ count: pending.length }, "Reconciling pending DSA submissions after boot");

  for (const submission of pending) {
    enqueueSubmitJob({
      dsaSubmissionId: submission.id,
      attemptId: submission.attemptId,
      userId: submission.userId,
      problemId: submission.problemId,
      contestId: submission.contestId,
      language: submission.language as Language,
      userCode: submission.code,
      signature: submission.problem.signature as unknown as BoilerplateSignature,
      testCases: submission.problem.testCases.map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
      })),
      totalPoints: submission.problem.points,
    });
  }
}
