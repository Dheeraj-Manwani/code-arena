import type { JudgeJob } from "../schema/job.schema";
import { WORKER_CONCURRENCY, JUDGE_RATE_MAX, JUDGE_RATE_WINDOW_MS } from "./constants";
import { processSubmitJob } from "./submitProcessor";
import { isTransientError } from "../judge/errors";
import { applySubmissionResult } from "../service/submissionResult.service";
import { logger } from "../lib/logger";

/**
 * In-process submit pool (Economy Service Phase 3) — the Redis-free replacement
 * for the BullMQ worker.
 *
 * Preserves the semantics BullMQ gave us:
 *  - bounded concurrency (WORKER_CONCURRENCY);
 *  - a token bucket that mirrors the old limiter (max 10 job starts / 1000ms),
 *    to respect Judge0/RapidAPI rate limits;
 *  - retry with exponential backoff for transient errors (max 3 attempts);
 *  - terminal errors (or exhausted retries) record a `runtime_error` verdict so
 *    the submission never lingers as `pending` (and the boot reconciler doesn't
 *    re-run it forever).
 *
 * Durability lives in the DB, not the queue: a crash leaves the row `pending`,
 * which jobs/reconcile.ts re-enqueues on the next boot.
 */
const MAX_ATTEMPTS = 3;
const BACKOFF_BASE_MS = 2000;

interface QueueItem {
  job: JudgeJob;
  attempt: number;
}

class SubmitPool {
  private readonly queue: QueueItem[] = [];
  private active = 0;
  private tokens = JUDGE_RATE_MAX;
  private closed = false;

  constructor(private readonly concurrency: number) {
    // Refill the token bucket each window. `unref` so the timer never keeps the
    // process alive on its own.
    const refill = setInterval(() => {
      this.tokens = JUDGE_RATE_MAX;
      this.drain();
    }, JUDGE_RATE_WINDOW_MS);
    refill.unref();
  }

  /** Number of jobs queued or in flight (used by graceful shutdown / tests). */
  get inFlight(): number {
    return this.active + this.queue.length;
  }

  enqueue(job: JudgeJob): void {
    if (this.closed) {
      logger.warn({ dsaSubmissionId: job.dsaSubmissionId }, "Pool closed — job left pending for reconcile");
      return;
    }
    this.queue.push({ job, attempt: 1 });
    this.drain();
  }

  private drain(): void {
    while (
      !this.closed &&
      this.active < this.concurrency &&
      this.tokens > 0 &&
      this.queue.length > 0
    ) {
      const item = this.queue.shift()!;
      this.tokens--;
      this.active++;
      void this.run(item);
    }
  }

  private async run(item: QueueItem): Promise<void> {
    try {
      await processSubmitJob(item.job);
    } catch (err) {
      await this.handleFailure(item, err);
    } finally {
      this.active--;
      this.drain();
    }
  }

  private async handleFailure(item: QueueItem, err: unknown): Promise<void> {
    const message = err instanceof Error ? err.message : String(err);

    if (isTransientError(err) && item.attempt < MAX_ATTEMPTS) {
      const delay = BACKOFF_BASE_MS * 2 ** (item.attempt - 1);
      logger.warn(
        { dsaSubmissionId: item.job.dsaSubmissionId, attempt: item.attempt, delay, err: message },
        "Transient judge error — retrying with backoff"
      );
      const timer = setTimeout(() => {
        this.queue.push({ job: item.job, attempt: item.attempt + 1 });
        this.drain();
      }, delay);
      timer.unref();
      return;
    }

    // Terminal, or retries exhausted.
    logger.error(
      { dsaSubmissionId: item.job.dsaSubmissionId, attempt: item.attempt, err: message },
      "Judge job failed permanently — recording runtime_error"
    );
    try {
      await applySubmissionResult(item.job.dsaSubmissionId, {
        status: "runtime_error",
        pointsEarned: 0,
        testCasesPassed: 0,
        totalTestCases: item.job.totalTestCases,
        executionTime: null,
      });
    } catch (updateErr) {
      // Leaving it `pending` is safe — the boot reconciler will pick it up.
      logger.error(
        {
          dsaSubmissionId: item.job.dsaSubmissionId,
          err: updateErr instanceof Error ? updateErr.message : String(updateErr),
        },
        "Failed to record terminal verdict — will be reconciled on next boot"
      );
    }
  }

  /**
   * Stop accepting new work and wait for in-flight jobs to finish (graceful
   * shutdown). Queued-but-not-started jobs stay `pending` and are reconciled on
   * the next boot.
   */
  async close(timeoutMs = 30_000): Promise<void> {
    this.closed = true;
    const start = Date.now();
    while (this.active > 0 && Date.now() - start < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

export const submitPool = new SubmitPool(WORKER_CONCURRENCY);
