import type { Job } from "bullmq";
import { ZodError } from "zod";
import { parseJob } from "./schema/job.schema";
import { UnrecoverableError } from "./errors";
import { childLogger } from "./logger";
import { submitToJudge0 } from "./judge/submit";
import { pollForVerdict } from "./judge/poll";
import { deriveVerdict } from "./judge/parse";
import { updateSubmission } from "./backend/updateSubmission";
import { updateAttemptScore } from "./backend/updateAttemptScore";

export async function processJob(job: Job): Promise<void> {
  let parsedJob;
  try {
    parsedJob = parseJob(job.data);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new UnrecoverableError(`Invalid job payload: ${err.message}`);
    }
    throw err;
  }

  const log = childLogger({
    jobId: parsedJob.jobId,
    dsaSubmissionId: parsedJob.dsaSubmissionId,
    attemptId: parsedJob.attemptId,
    workerId: job.id,
  });

  log.info("Processing job started");

  const token = await submitToJudge0(parsedJob);
  log.info({ token }, "Judge0 token received");

  const judgeResponse = await pollForVerdict(token);
  log.info(
    { statusId: judgeResponse.status.id, description: judgeResponse.status.description },
    "Judge0 raw status"
  );

  const { status, testCasesPassed, executionTime } = deriveVerdict(
    judgeResponse,
    parsedJob.totalTestCases
  );

  const pointsEarned = status === "accepted" ? parsedJob.totalPoints : 0;

  log.info(
    { status, testCasesPassed, totalTestCases: parsedJob.totalTestCases, pointsEarned, executionTime },
    "Final verdict"
  );

  await updateSubmission(parsedJob.dsaSubmissionId, {
    status,
    pointsEarned,
    testCasesPassed,
    totalTestCases: parsedJob.totalTestCases,
    executionTime,
  });

  if (pointsEarned > 0) {
    await updateAttemptScore(parsedJob.attemptId, pointsEarned);
  }

  log.info("Job completed successfully");
}
