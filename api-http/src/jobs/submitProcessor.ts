import { childLogger } from "../lib/logger";
import { submitToJudge0 } from "../judge/submit";
import { pollForVerdict } from "../judge/poll";
import { deriveVerdict } from "../judge/parse";
import { applySubmissionResult } from "../service/submissionResult.service";
import type { JudgeJob } from "../schema/job.schema";

/**
 * Submit pipeline: Judge0 submit → poll → derive verdict → persist + broadcast.
 *
 * Economy Service Phase 3: this now takes a plain `JudgeJob` (built in-process,
 * already typed — no Zod re-parse of untrusted Redis data) and is driven by the
 * in-process pool (jobs/pool.ts). It throws on failure; the pool classifies the
 * error (transient → retry with backoff, terminal → record a failed verdict).
 */
export async function processSubmitJob(job: JudgeJob): Promise<void> {
  const log = childLogger({
    jobId: job.jobId,
    dsaSubmissionId: job.dsaSubmissionId,
    attemptId: job.attemptId,
  });

  log.info("Processing job started");

  const token = await submitToJudge0(job);
  log.info({ token }, "Judge0 token received");

  const judgeResponse = await pollForVerdict(token);
  log.info(
    { statusId: judgeResponse.status.id, description: judgeResponse.status.description },
    "Judge0 raw status"
  );

  const { status, testCasesPassed, executionTime } = deriveVerdict(judgeResponse, job.totalTestCases);
  const pointsEarned = status === "accepted" ? job.totalPoints : 0;

  log.info(
    { status, testCasesPassed, totalTestCases: job.totalTestCases, pointsEarned, executionTime },
    "Final verdict"
  );

  await applySubmissionResult(job.dsaSubmissionId, {
    status,
    pointsEarned,
    testCasesPassed,
    totalTestCases: job.totalTestCases,
    executionTime,
  });

  log.info("Job completed successfully");
}
