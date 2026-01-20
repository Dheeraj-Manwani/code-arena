import { ContestStatus, ContestType } from "@prisma/client";
import prisma from "../lib/db";

export const getStats = async () => {
    // Count total contests
    const totalContests = await prisma.contest.count({});

    // Count total MCQ questions
    const totalMcqs = await prisma.mcqQuestion.count({});

    // Count total DSA problems
    const totalDsaProblems = await prisma.dsaProblem.count({});

    // Count total participants (users with contestee role)
    const totalParticipants = await prisma.user.count({
        where: {
            role: "contestee",
        },
    });

    return {
        totalContests,
        totalMcqs,
        totalDsaProblems,
        totalParticipants,
    };
};
