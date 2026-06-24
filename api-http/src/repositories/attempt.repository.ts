import prisma from "../lib/db";
import type { AttemptStatus } from "@prisma/client";

export const getContestAttemptCount = async (
    userId: number,
    contestId: number,
) => {
    return await prisma.contestAttempt.count({
        where: {
            userId,
            contestId,
        },
    });
};

/**
 * Atomically create the single competitive attempt for a (user, contest).
 * A transaction-scoped Postgres advisory lock serialises concurrent "start"
 * requests so the count-check + create can't race (issues.md §4.4). There is no
 * unique constraint to lean on (practice contests allow many attempts), so the
 * lock is what guarantees at-most-one competitive attempt.
 *
 * Returns the created attempt, or null when an attempt already exists (limit reached).
 */
export const createCompetitiveAttempt = async (
    userId: number,
    contestId: number,
    deadlineAt: Date,
) => {
    return await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(${userId}::int, ${contestId}::int)`;

        const count = await tx.contestAttempt.count({ where: { userId, contestId } });
        if (count > 0) {
            return null;
        }

        return await tx.contestAttempt.create({
            data: { userId, contestId, status: "in_progress", deadlineAt },
        });
    });
};

export const getOrCreateContestAttempt = async (
    userId: number,
    contestId: number,
    deadlineAt: Date,
) => {
    // Try to find an existing in-progress attempt
    const existingAttempt = await prisma.contestAttempt.findFirst({
        where: {
            userId,
            contestId,
            status: "in_progress",
            deadlineAt: {
                gt: new Date(),
            },
        },
    });

    if (existingAttempt) {
        return existingAttempt;
    }

    // Create a new attempt
    return await prisma.contestAttempt.create({
        data: {
            userId,
            contestId,
            status: "in_progress",
            deadlineAt: deadlineAt,
        },
    });
};

export const getContestAttemptById = async (attemptId: number) => {
    return await prisma.contestAttempt.findUnique({
        where: { id: attemptId },
    });
};

export const getInProgressAttemptByUserAndContest = async (
    userId: number,
    contestId: number,
) => {
    return await prisma.contestAttempt.findFirst({
        where: {
            userId,
            contestId,
            status: "in_progress",
            deadlineAt: {
                gt: new Date(),
            },
        },
    });
};

/**
 * Advance currentProblemId to `nextProblemId` after submitting `fromContestQuestionId`.
 * The advance is guarded so it only fires when the pointer is still at the question
 * just submitted (or unset) — a single conditional update the DB evaluates atomically,
 * so rapid/out-of-order submits can't interleave the pointer backwards (issues.md §4.1).
 */
export const advanceCurrentProblemId = async (
    attemptId: number,
    userId: number,
    contestId: number,
    fromContestQuestionId: number,
    nextProblemId: number | null,
) => {
    return await prisma.contestAttempt.updateMany({
        where: {
            id: attemptId,
            userId,
            contestId,
            status: "in_progress",
            OR: [{ currentProblemId: fromContestQuestionId }, { currentProblemId: null }],
        },
        data: { currentProblemId: nextProblemId },
    });
};

/**
 * Lazily close a single attempt whose deadline has passed (issues.md §2.1/§4.6).
 * Returns the effective status — "timed_out" if it was just expired, else unchanged.
 * Idempotent and safe under concurrency thanks to the status guard on the write.
 */
export const applyAttemptTimeout = async (attempt: {
    id: number;
    status: AttemptStatus;
    startedAt: Date;
    deadlineAt: Date;
}): Promise<AttemptStatus> => {
    if (attempt.status !== "in_progress" || attempt.deadlineAt.getTime() > Date.now()) {
        return attempt.status;
    }

    const durationMs = attempt.deadlineAt.getTime() - attempt.startedAt.getTime();
    await prisma.contestAttempt.updateMany({
        where: { id: attempt.id, status: "in_progress" },
        data: { status: "timed_out", durationMs },
    });
    return "timed_out";
};

/**
 * Bulk-expire all of a user's stale in_progress attempts (issues.md §2.1/§4.6).
 * durationMs is computed per row (deadlineAt - startedAt) in SQL. Used before
 * listing a user's attempts so statuses/durations read correctly without N writes.
 */
export const timeoutExpiredAttemptsForUser = async (userId: number) => {
    await prisma.$executeRaw`
        UPDATE "ContestAttempt"
        SET status = 'timed_out',
            "durationMs" = CAST(EXTRACT(EPOCH FROM ("deadlineAt" - "startedAt")) * 1000 AS INTEGER)
        WHERE "userId" = ${userId}
          AND status = 'in_progress'
          AND "deadlineAt" < NOW()`;
};

export const markAttemptSubmitted = async (
    attemptId: number,
    userId: number,
    contestId: number,
) => {
    // Read startedAt so we can populate durationMs (issues.md §4.6). The status guard
    // below still makes the write idempotent for concurrent submit requests.
    const attempt = await prisma.contestAttempt.findUnique({
        where: { id: attemptId },
        select: { startedAt: true },
    });

    const submittedAt = new Date();
    const durationMs = attempt
        ? submittedAt.getTime() - attempt.startedAt.getTime()
        : null;

    const result = await prisma.contestAttempt.updateMany({
        where: {
            id: attemptId,
            userId,
            contestId,
            status: "in_progress",
        },
        data: { status: "submitted", submittedAt, durationMs },
    });
    return result.count > 0;
};

const attemptListContestSelect = {
    id: true,
    title: true,
    type: true,
    questions: {
        include: {
            mcq: { select: { points: true } },
            dsa: { select: { points: true } },
        },
    },
} as const;

export const getAttemptsForUserPaginated = async (
    userId: number,
    skip: number,
    take: number,
) => {
    return await prisma.contestAttempt.findMany({
        where: { userId },
        orderBy: { startedAt: "desc" },
        skip,
        take,
        include: {
            contest: { select: attemptListContestSelect },
        },
    });
};

export const countAttemptsForUser = async (userId: number) => {
    return await prisma.contestAttempt.count({ where: { userId } });
};

export const getLeaderboardRanksForUserContests = async (
    userId: number,
    contestIds: number[],
) => {
    if (contestIds.length === 0) return [];
    return await prisma.contestLeaderboard.findMany({
        where: { userId, contestId: { in: contestIds } },
        select: { contestId: true, rank: true },
    });
};

export const getAttemptWithContestQuestions = async (attemptId: number) => {
    return await prisma.contestAttempt.findUnique({
        where: { id: attemptId },
        include: {
            contest: {
                select: {
                    id: true,
                    title: true,
                    type: true,
                    questions: {
                        orderBy: { order: "asc" },
                        select: {
                            id: true,
                            order: true,
                            mcqId: true,
                            dsaId: true,
                            mcq: {
                                select: { id: true, questionText: true, points: true },
                            },
                            dsa: {
                                select: { id: true, title: true, points: true },
                            },
                        },
                    },
                },
            },
        },
    });
};
