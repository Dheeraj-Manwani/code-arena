import type { Job } from "bullmq";
import { UnrecoverableError as BullUnrecoverableError } from "bullmq";
import { ZodError } from "zod";
import { parseRunJob } from "./schema/run-job.schema";
import { UnrecoverableError } from "./errors";
import { childLogger } from "./logger";
import { submitRunToJudge0 } from "./judge/submit";
import { pollForVerdict } from "./judge/poll";
import { connection } from "./queue/connection";

export async function processRunJob(job: Job): Promise<void> {
  let parsedJob;
  try {
    parsedJob = parseRunJob(job.data);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new UnrecoverableError(`Invalid run job payload: ${err.message}`);
    }
    throw err;
  }

  const log = childLogger({
    runId: parsedJob.runId,
    workerId: job.id,
  });

  log.info("Run job started");

  try {
    const token = await submitRunToJudge0(parsedJob.language, parsedJob.sourceCode);
    const judgeResponse = await pollForVerdict(token);

    const executionTime =
      judgeResponse.time !== null ? Math.round(parseFloat(judgeResponse.time) * 1000) : null;

    await connection.publish(
      parsedJob.responseChannel,
      JSON.stringify({
        ok: true,
        runId: parsedJob.runId,
        token: judgeResponse.token,
        status: judgeResponse.status,
        stdout: judgeResponse.stdout,
        stderr: judgeResponse.stderr,
        compileOutput: judgeResponse.compile_output,
        memory: judgeResponse.memory,
        executionTime,
      })
    );

    log.info("Run job completed");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error({ err: message }, "Run job failed");
    await connection.publish(
      parsedJob.responseChannel,
      JSON.stringify({
        ok: false,
        runId: parsedJob.runId,
        error: message,
      })
    );
    // Result already delivered over pub/sub; avoid BullMQ retries republishing to a dead channel.
    throw new BullUnrecoverableError(message);
  }
}
