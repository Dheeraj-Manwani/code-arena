import prisma from "../lib/db";
import { logger } from "../lib/logger";

/**
 * Catalogue counters (PRACTICE_MODE_AND_NAVIGATION.md §4.5).
 *
 * Maintained on every verdict — contest and practice alike, since solving a
 * problem inside a contest means you have solved it.
 */

interface RecordVerdictParams {
  userId: number;
  problemId: number;
  isAccepted: boolean;
  submittedAt: Date;
}

/**
 * Fold one verdict into `ProblemStat` and `UserProblemStatus`.
 *
 * Two things make this fiddly, and both are handled in a single transaction:
 *
 * 1. **`solvedBy` must count distinct users**, so it may only increment on a
 *    user's *first* accepted submission for the problem. The `UserProblemStatus`
 *    row is the record of that, and the update is conditioned on it not already
 *    being `solved`.
 * 2. **`solved` is terminal.** A wrong answer submitted after a correct one must
 *    not demote the user back to `attempted`.
 *
 * Best-effort by design: the caller treats a failure here as non-fatal, because
 * a lost counter is a cosmetic catalogue inaccuracy and must never cost a user
 * their verdict.
 */
export const recordVerdictForStats = async ({
  userId,
  problemId,
  isAccepted,
  submittedAt,
}: RecordVerdictParams): Promise<void> => {
  await prisma.$transaction(async (tx) => {
    // Serialise concurrent verdicts for this (user, problem) so two accepted
    // submissions landing together can't both see "not yet solved" and double
    // -count solvedBy. The lock key is scoped to this pair.
    //
    // The two-key overload is (int4, int4) — casting to bigint resolves to
    // pg_advisory_xact_lock(bigint, bigint), which does not exist. Both columns
    // are Int, so int4 is the right width.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${userId}::int, ${problemId}::int)`;

    const existing = await tx.userProblemStatus.findUnique({
      where: { userId_problemId: { userId, problemId } },
      select: { status: true },
    });

    const alreadySolved = existing?.status === "solved";
    const isFirstSolve = isAccepted && !alreadySolved;

    await tx.problemStat.upsert({
      where: { problemId },
      create: {
        problemId,
        totalSubmissions: 1,
        acceptedSubmissions: isAccepted ? 1 : 0,
        solvedBy: isFirstSolve ? 1 : 0,
        acceptanceRate: isAccepted ? 1 : 0,
      },
      update: {
        totalSubmissions: { increment: 1 },
        acceptedSubmissions: isAccepted ? { increment: 1 } : undefined,
        solvedBy: isFirstSolve ? { increment: 1 } : undefined,
      },
    });

    // acceptanceRate is derived from the counters we just moved, so it has to be
    // recomputed from the post-update row rather than incremented.
    const stat = await tx.problemStat.findUniqueOrThrow({
      where: { problemId },
      select: { totalSubmissions: true, acceptedSubmissions: true },
    });

    await tx.problemStat.update({
      where: { problemId },
      data: {
        acceptanceRate:
          stat.totalSubmissions === 0
            ? 0
            : stat.acceptedSubmissions / stat.totalSubmissions,
      },
    });

    if (!existing) {
      await tx.userProblemStatus.create({
        data: {
          userId,
          problemId,
          status: isAccepted ? "solved" : "attempted",
          solvedAt: isAccepted ? submittedAt : null,
          firstAttemptedAt: submittedAt,
        },
      });
      return;
    }

    if (isFirstSolve) {
      await tx.userProblemStatus.update({
        where: { userId_problemId: { userId, problemId } },
        data: { status: "solved", solvedAt: submittedAt },
      });
    }
    // Already solved, or still unsolved after another wrong answer — nothing to
    // change. `solved` is terminal.
  });
};

/** Never let a counter failure cost a user their verdict. */
export const recordVerdictForStatsSafe = async (
  params: RecordVerdictParams,
): Promise<void> => {
  try {
    await recordVerdictForStats(params);
  } catch (err) {
    logger.error(
      {
        userId: params.userId,
        problemId: params.problemId,
        err: err instanceof Error ? err.message : String(err),
      },
      "Failed to record catalogue stats for verdict — counters may drift",
    );
  }
};
