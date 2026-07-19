import { childLogger } from "../lib/logger";
import { submitToJudge0 } from "../judge/submit";
import { pollForVerdict } from "../judge/poll";
import { deriveVerdict } from "../judge/parse";
import { applyJobResult } from "../service/submissionResult.service";
import { targetSubmissionId, type JudgeJob } from "../schema/job.schema";

/**
 * Submit pipeline: Judge0 submit → poll → derive verdict → persist + broadcast.
 *
 * Economy Service Phase 3: this takes a plain `JudgeJob` (built in-process,
 * already typed) and is driven by the in-process pool (jobs/pool.ts). It throws
 * on failure; the pool classifies the error (transient → retry with backoff,
 * terminal → record a failed verdict).
 *
 * The pipeline is identical for contest and practice work — only where the
 * verdict lands differs, which `applyJobResult` routes on `job.target`.
 */
export async function processSubmitJob(job: JudgeJob): Promise<void> {
  const log = childLogger({
    jobId: job.jobId,
    kind: job.target.kind,
    submissionId: targetSubmissionId(job.target),
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

  await applyJobResult(job.target, {
    status,
    pointsEarned,
    testCasesPassed,
    totalTestCases: job.totalTestCases,
    executionTime,
  });

  log.info("Job completed successfully");
}
