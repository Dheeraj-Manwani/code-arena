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
