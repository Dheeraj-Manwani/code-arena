import prisma from "../lib/db";

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

export const updateCurrentProblemId = async (
    attemptId: number,
    userId: number,
    contestId: number,
    currentProblemId: number | null,
) => {
    return await prisma.contestAttempt.updateMany({
        where: {
            id: attemptId,
            userId,
            contestId,
            status: "in_progress",
        },
        data: { currentProblemId },
    });
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
