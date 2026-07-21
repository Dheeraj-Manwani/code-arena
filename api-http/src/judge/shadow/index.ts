import { compareExecutions } from "./compare";
import { judge0Executor } from "../judge0";
import { localExecutor } from "../local";
import { SHADOW_MAX_CONCURRENCY, SHADOW_MAX_QUEUED } from "../../jobs/constants";
import { logger } from "../../lib/logger";
import type { Executor, ExecutionRequest } from "../executor";
import type { Judge0StatusResponse } from "../../schema/judge0.schema";

/**
 * Shadow mode (SELF_HOSTED_JUDGE.md Phase 5).
 *
 * The reference backend stays authoritative and its result is what the user
 * gets. The candidate runs alongside purely to be compared, and its output is
 * discarded. This is how the local backend earns trust on real traffic before
 * anyone's contest ranking depends on it.
 *
 * Two properties this must have, both of which shape the implementation:
 *
 *  1. **It cannot change a verdict.** The candidate runs after the reference has
 *     already been returned, inside its own try/catch. A crash, a timeout, or a
 *     missing Docker daemon produces a log line and nothing else.
 *
 *  2. **It cannot slow a submission down.** The candidate is deliberately NOT
 *     awaited — `execute` returns as soon as the reference does. Comparison work
 *     happens on a later tick.
 *
 * Because (2) means work can accumulate faster than it drains, shadow work is
 * both concurrency-capped and *droppable*: past a queue depth the extra runs are
 * discarded and counted. Shadow mode is sampling, not accounting — a lower
 * sample rate is always preferable to memory pressure on the API process.
 */

interface ShadowStats {
  compared: number;
  diverged: number;
  dropped: number;
  failed: number;
}

const stats: ShadowStats = { compared: 0, diverged: 0, dropped: 0, failed: 0 };

/** Snapshot of shadow-mode counters, for diagnostics and tests. */
export function shadowStats(): Readonly<ShadowStats> {
  return { ...stats };
}

export function resetShadowStats(): void {
  stats.compared = 0;
  stats.diverged = 0;
  stats.dropped = 0;
  stats.failed = 0;
}

/**
 * Exported as a factory so tests can drive it with fake backends rather than a
 * live Judge0 account and a Docker daemon.
 */
export function createShadowExecutor(reference: Executor, candidate: Executor): Executor {
  let inFlight = 0;
  let queued = 0;

  async function runCandidate(
    req: ExecutionRequest,
    referenceResult: Judge0StatusResponse
  ): Promise<void> {
    queued--;
    inFlight++;
    try {
      const candidateResult = await candidate.execute(req);
      const divergence = compareExecutions(referenceResult, candidateResult);

      stats.compared++;
      if (divergence.kind === "none") return;

      stats.diverged++;
      // One line per divergence, with everything triage needs: which way it
      // went, and enough of the shapes to classify it without a re-run.
      logger.warn(
        {
          language: req.language,
          kind: divergence.kind,
          label: divergence.label,
          reference: divergence.reference,
          candidate: divergence.candidate,
          referenceBackend: reference.name,
          candidateBackend: candidate.name,
        },
        "Shadow divergence"
      );
    } catch (err) {
      // The candidate failing is a fact about the candidate, never about the
      // submission. Swallow it.
      stats.failed++;
      logger.warn(
        {
          language: req.language,
          candidateBackend: candidate.name,
          err: err instanceof Error ? err.message : String(err),
        },
        "Shadow candidate execution failed"
      );
    } finally {
      inFlight--;
    }
  }

  return {
    name: `shadow(${reference.name}->${candidate.name})`,

    async execute(req: ExecutionRequest): Promise<Judge0StatusResponse> {
      const referenceResult = await reference.execute(req);

      if (inFlight + queued >= SHADOW_MAX_CONCURRENCY + SHADOW_MAX_QUEUED) {
        stats.dropped++;
      } else {
        queued++;
        // Intentionally not awaited: the submission's latency must not include
        // the candidate. `runCandidate` never rejects.
        void runCandidate(req, referenceResult);
      }

      return referenceResult;
    },
  };
}

/**
 * Judge0 stays authoritative; the local container backend is the candidate.
 * Reversing these before the Phase 5 exit criteria are met would put unproven
 * verdicts in front of users.
 */
export const shadowExecutor: Executor = createShadowExecutor(judge0Executor, localExecutor);
