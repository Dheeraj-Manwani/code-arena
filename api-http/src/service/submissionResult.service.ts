import * as submissionRepo from "../repositories/submission.repository";
import * as attemptRepo from "../repositories/attempt.repository";
import * as practiceRepo from "../repositories/practice.repository";
import { recordVerdictForStatsSafe } from "../repositories/stats.problem.repository";
import { recordVerdictForLearnSafe } from "../repositories/learnProgress.repository";
import { bus } from "../realtime/bus";
import type { JudgeTarget, UpdateSubmissionPayload } from "../schema/job.schema";

/**
 * Apply a judge verdict and fan out the realtime event.
 *
 * This is the in-process replacement for the old worker→api-http HTTP callbacks
 * and the Redis publish that followed (Economy Service Phase 2). It now also
 * routes by target: contest verdicts score an attempt and reach a contest room,
 * practice verdicts do neither (PRACTICE_MODE_AND_NAVIGATION.md §4.1).
 */
export async function applyJobResult(
  target: JudgeTarget,
  verdict: UpdateSubmissionPayload,
): Promise<void> {
  if (target.kind === "contest") {
    await applyContestSubmissionResult(target.dsaSubmissionId, verdict);
    return;
  }
  await applyPracticeSubmissionResult(target.practiceSubmissionId, verdict);
}

export async function applyContestSubmissionResult(
  dsaSubmissionId: number,
  verdict: UpdateSubmissionPayload,
): Promise<void> {
  const updated = await submissionRepo.applyDsaVerdict(dsaSubmissionId, verdict);

  if (verdict.pointsEarned > 0) {
    await attemptRepo.incrementAttemptScore(updated.attemptId, verdict.pointsEarned);
  }

  // Contest submissions count toward the catalogue's stats too (§4.5): solving a
  // problem in a contest means you have solved it.
  await recordVerdictForStatsSafe({
    userId: updated.userId,
    problemId: updated.problemId,
    isAccepted: verdict.status === "accepted",
    submittedAt: updated.submittedAt,
  });

  // Solving a problem anywhere credits every learn path containing it
  // (LEARN_PATHS.md §5.2). Safe-wrapped for the same reason as the call above:
  // this runs inside contest verdict handling, and a learn progress bar must
  // never cost a participant their scored result.
  await recordVerdictForLearnSafe(
    updated.userId,
    updated.problemId,
    verdict.status === "accepted",
    updated.submittedAt,
  );

  bus.emit("submission_result", {
    type: "SUBMISSION_RESULT",
    scope: "contest",
    dsaSubmissionId: updated.id,
    attemptId: updated.attemptId,
    userId: updated.userId,
    contestId: updated.attempt.contestId,
    // Use the verdict's status: it excludes "pending", which the DB column type
    // still allows but we never write here.
    status: verdict.status,
    pointsEarned: updated.pointsEarned,
    testCasesPassed: updated.testCasesPassed,
    totalTestCases: updated.totalTestCases,
  });
}

/**
 * Practice verdicts touch no attempt and no leaderboard — practice is unscored
 * (`pointsEarned` is ignored), so nothing here can move a contest ranking.
 */
export async function applyPracticeSubmissionResult(
  practiceSubmissionId: number,
  verdict: UpdateSubmissionPayload,
): Promise<void> {
  // Pick the fields explicitly so `pointsEarned` is dropped by intent rather
  // than by the repository happening not to read it.
  const updated = await practiceRepo.applyPracticeVerdict(practiceSubmissionId, {
    status: verdict.status,
    testCasesPassed: verdict.testCasesPassed,
    totalTestCases: verdict.totalTestCases,
    executionTime: verdict.executionTime,
  });

  await recordVerdictForStatsSafe({
    userId: updated.userId,
    problemId: updated.problemId,
    isAccepted: verdict.status === "accepted",
    submittedAt: updated.submittedAt,
  });

  await recordVerdictForLearnSafe(
    updated.userId,
    updated.problemId,
    verdict.status === "accepted",
    updated.submittedAt,
  );

  bus.emit("submission_result", {
    type: "SUBMISSION_RESULT",
    scope: "practice",
    practiceSubmissionId: updated.id,
    userId: updated.userId,
    problemId: updated.problemId,
    status: verdict.status,
    testCasesPassed: updated.testCasesPassed,
    totalTestCases: updated.totalTestCases,
  });
}
