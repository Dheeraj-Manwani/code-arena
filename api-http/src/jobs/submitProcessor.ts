import { childLogger } from "../lib/logger";
import { getExecutor } from "../judge/executor";
import { deriveVerdict } from "../judge/parse";
import { applyJobResult } from "../service/submissionResult.service";
import { targetSubmissionId, type JudgeJob } from "../schema/job.schema";

/**
 * Submit pipeline: execute → derive verdict → persist + broadcast.
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

  // Self-Hosted Judge Phase 1: the submit-then-poll pair is now one call behind
  // the `Executor` seam, so which backend runs the code is a config concern.
  const executor = getExecutor();
  const judgeResponse = await executor.execute({
    language: job.language,
    sourceCode: job.sourceCode,
  });
  log.info(
    {
      backend: executor.name,
      statusId: judgeResponse.status.id,
      description: judgeResponse.status.description,
    },
    "Judge raw status"
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
