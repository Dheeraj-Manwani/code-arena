import prisma from "../lib/db";
import { logger } from "../lib/logger";
import { rollupPathProgress } from "../repositories/learnProgress.repository";

/**
 * Boot-time repair for drifted learn counters (LEARN_PATHS.md Phase 4).
 *
 * The verdict fan-out is deliberately best-effort — `recordVerdictForLearnSafe`
 * swallows failures so a counter can never cost a user their verdict. That is
 * the right trade, and it means a failure leaves `UserLearnQuestionProgress`
 * rows without the container counters that summarise them.
 *
 * This sweep recomputes those counters from the question rows, which are the
 * source of truth. It is cheap because it only touches (user, path) pairs that
 * actually have progress, and safe because the rollup is idempotent — running it
 * on correct data is a no-op write.
 *
 * Following `jobs/reconcile.ts`: fire-and-forget at boot, never blocking startup.
 */
export async function reconcileLearnProgress(): Promise<void> {
  const pairs = await prisma.userLearnPathProgress.findMany({
    select: { userId: true, pathId: true },
  });

  if (pairs.length === 0) return;

  let repaired = 0;

  for (const { userId, pathId } of pairs) {
    try {
      const changed = await rollupPathProgress(userId, pathId);
      if (changed) repaired += 1;
    } catch (err) {
      // One bad pair must not abort the sweep for everyone else.
      logger.error(
        { userId, pathId, err: err instanceof Error ? err.message : String(err) },
        "Failed to reconcile learn progress for one path",
      );
    }
  }

  logger.info(
    { checked: pairs.length, repaired },
    "Learn progress reconciliation complete",
  );
}
