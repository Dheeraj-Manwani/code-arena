import { targetSubmissionId, type JudgeJob } from "../schema/job.schema";
import { WORKER_CONCURRENCY, JUDGE_RATE_MAX, JUDGE_RATE_WINDOW_MS } from "./constants";
import { processSubmitJob } from "./submitProcessor";
import { isTransientError } from "../judge/errors";
import { applyJobResult } from "../service/submissionResult.service";
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
 *
 * Contest work outranks practice work (PRACTICE_MODE_AND_NAVIGATION.md §4.3).
 * Practice load is unbounded and continuous while contest load is bounded and
 * time-critical, and both share this one pool — so a practice backlog must never
 * push a contest verdict behind it. See `nextItem` for the starvation tradeoff.
 */
const MAX_ATTEMPTS = 3;
const BACKOFF_BASE_MS = 2000;

interface QueueItem {
  job: JudgeJob;
  attempt: number;
}

/** Exported for tests; the process uses the `submitPool` singleton below. */
export class SubmitPool {
  /** Contest jobs. Always drained before `practiceQueue`. */
  private readonly contestQueue: QueueItem[] = [];
  private readonly practiceQueue: QueueItem[] = [];
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
    return this.active + this.contestQueue.length + this.practiceQueue.length;
  }

  /** Queue depth by kind — for tests and diagnostics. */
  get queueDepth(): { contest: number; practice: number } {
    return {
      contest: this.contestQueue.length,
      practice: this.practiceQueue.length,
    };
  }

  private queueFor(job: JudgeJob): QueueItem[] {
    return job.target.kind === "contest" ? this.contestQueue : this.practiceQueue;
  }

  enqueue(job: JudgeJob): void {
    if (this.closed) {
      logger.warn(
        { kind: job.target.kind, submissionId: targetSubmissionId(job.target) },
        "Pool closed — job left pending for reconcile",
      );
      return;
    }
    this.queueFor(job).push({ job, attempt: 1 });
    this.drain();
  }

  /**
   * Strict priority: a queued contest job always goes first.
   *
   * This can starve practice under sustained contest load, and that is the
   * intended tradeoff — a contest has a deadline and a ranking riding on its
   * verdicts, practice does not. Starvation is bounded in practice because a
   * contest is a finite event; if that stops being true, this is where a
   * reserved practice slice would go.
   */
  private nextItem(): QueueItem | undefined {
    return this.contestQueue.shift() ?? this.practiceQueue.shift();
  }

  private drain(): void {
    while (!this.closed && this.active < this.concurrency && this.tokens > 0) {
      const item = this.nextItem();
      if (!item) {
        return;
      }
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
    const submissionId = targetSubmissionId(item.job.target);
    const kind = item.job.target.kind;

    if (isTransientError(err) && item.attempt < MAX_ATTEMPTS) {
      const delay = BACKOFF_BASE_MS * 2 ** (item.attempt - 1);
      logger.warn(
        { kind, submissionId, attempt: item.attempt, delay, err: message },
        "Transient judge error — retrying with backoff"
      );
      const timer = setTimeout(() => {
        // Re-queue by kind so a retried contest job keeps its priority.
        this.queueFor(item.job).push({ job: item.job, attempt: item.attempt + 1 });
        this.drain();
      }, delay);
      timer.unref();
      return;
    }

    // Terminal, or retries exhausted.
    logger.error(
      { kind, submissionId, attempt: item.attempt, err: message },
      "Judge job failed permanently — recording runtime_error"
    );
    try {
      await applyJobResult(item.job.target, {
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
          kind,
          submissionId,
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
