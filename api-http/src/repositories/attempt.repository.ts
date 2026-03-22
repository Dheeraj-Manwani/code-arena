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
    const result = await prisma.contestAttempt.updateMany({
        where: {
            id: attemptId,
            userId,
            contestId,
            status: "in_progress",
        },
        data: { status: "submitted" },
    });
    return result.count > 0;
};
