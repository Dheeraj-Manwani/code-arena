import * as submissionRepo from "../repositories/submission.repository";
import * as attemptRepo from "../repositories/attempt.repository";
import { bus } from "../realtime/bus";
import type { UpdateSubmissionPayload } from "../schema/job.schema";

/**
 * Apply a judge verdict to a DSA submission and fan out the realtime event
 * (Economy Service Phase 2).
 *
 * This is the in-process replacement for the old worker→api-http HTTP callbacks
 * (`PATCH /api/internal/submissions/dsa/:id` + `PATCH /api/internal/attempts/:id/score`)
 * and the Redis publish that followed. The in-process judge processor calls this
 * directly, so there is no internal HTTP route and no `BACKEND_INTERNAL_SECRET`.
 */
export async function applySubmissionResult(
  dsaSubmissionId: number,
  verdict: UpdateSubmissionPayload
): Promise<void> {
  const updated = await submissionRepo.applyDsaVerdict(dsaSubmissionId, verdict);

  if (verdict.pointsEarned > 0) {
    await attemptRepo.incrementAttemptScore(updated.attemptId, verdict.pointsEarned);
  }

  bus.emit("submission_result", {
    type: "SUBMISSION_RESULT",
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
