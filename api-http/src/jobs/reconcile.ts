import { enqueueSubmitJob } from "./submitQueue";
import * as submissionRepo from "../repositories/submission.repository";
import * as practiceRepo from "../repositories/practice.repository";
import { logger } from "../lib/logger";
import type { BoilerplateSignature } from "../util/boilerplate/types";
import type { Language } from "../schema/language.schema";

/**
 * Boot-time durability sweep (Economy Service Phase 3).
 *
 * The in-process pool has no persistence, so if the process died mid-judge the
 * submission is left `status = "pending"`. On startup the pool is empty and
 * nothing else is judging, so every `pending` submission is by definition
 * orphaned — re-enqueue them. Terminal failures are recorded as `runtime_error`
 * (see jobs/pool.ts), so they don't reappear here on every restart.
 *
 * Both tables must be swept: practice submissions live in their own table
 * (PRACTICE_MODE_AND_NAVIGATION.md §4.1), and a sweep that only looked at
 * `DsaSubmission` would leave crash-interrupted practice work pending forever.
 */
export async function reconcilePendingSubmissions(): Promise<void> {
  await Promise.all([reconcileContestSubmissions(), reconcilePracticeSubmissions()]);
}

async function reconcileContestSubmissions(): Promise<void> {
  const pending = await submissionRepo.getPendingDsaSubmissionsWithProblem();
  if (pending.length === 0) {
    return;
  }

  logger.info({ count: pending.length }, "Reconciling pending contest DSA submissions after boot");

  for (const submission of pending) {
    enqueueSubmitJob({
      target: {
        kind: "contest",
        dsaSubmissionId: submission.id,
        attemptId: submission.attemptId,
        contestId: submission.contestId,
      },
      userId: submission.userId,
      problemId: submission.problemId,
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

async function reconcilePracticeSubmissions(): Promise<void> {
  const pending = await practiceRepo.getPendingPracticeSubmissionsWithProblem();
  if (pending.length === 0) {
    return;
  }

  logger.info({ count: pending.length }, "Reconciling pending practice submissions after boot");

  for (const submission of pending) {
    enqueueSubmitJob({
      target: { kind: "practice", practiceSubmissionId: submission.id },
      userId: submission.userId,
      problemId: submission.problemId,
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
