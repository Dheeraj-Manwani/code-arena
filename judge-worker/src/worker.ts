import { Worker } from "bullmq";
import { connection } from "./queue/connection";
import { QUEUE_NAME, RUN_QUEUE_NAME, WORKER_CONCURRENCY } from "./queue/constants";
import { processJob } from "./processor";
import { processRunJob } from "./runProcessor";
import { logger } from "./logger";

function attachWorkerEvents(worker: Worker, queueName: string): void {
  worker.on("completed", (job) => {
    const duration = job?.finishedOn && job?.processedOn
      ? job.finishedOn - job.processedOn
      : null;
    logger.info({ queueName, jobId: job?.id, duration }, "Job completed");
  });

  worker.on("failed", (job, err) => {
    const maxAttempts = job?.opts?.attempts ?? 1;
    const attemptsMade = job?.attemptsMade ?? 0;
    // A job is exhausted when it has no retries left; surface that as an alert so
    // an operator can investigate (e.g. Judge0 down) rather than losing it silently.
    const exhausted = !job || attemptsMade >= maxAttempts;
    const meta = { queueName, jobId: job?.id, attemptsMade, maxAttempts, error: err.message };

    if (exhausted) {
      logger.error({ ...meta, alert: true }, "ALERT: job exhausted all retries and failed permanently");
    } else {
      logger.warn(meta, "Job attempt failed — will retry");
    }
  });

  worker.on("error", (err) => {
    logger.error({ queueName, error: err.message }, "Worker error");
  });

  worker.on("stalled", (jobId) => {
    logger.warn({ queueName, jobId }, "Job stalled");
  });
}

export function createWorkers(): Worker[] {
  const worker = new Worker(QUEUE_NAME, processJob, {
    concurrency: WORKER_CONCURRENCY,
    limiter: { max: 10, duration: 1000 },
    connection,
  });
  attachWorkerEvents(worker, QUEUE_NAME);

  const runWorker = new Worker(RUN_QUEUE_NAME, processRunJob, {
    concurrency: WORKER_CONCURRENCY,
    limiter: { max: 10, duration: 1000 },
    connection,
  });
  attachWorkerEvents(runWorker, RUN_QUEUE_NAME);

  return [worker, runWorker];
}
