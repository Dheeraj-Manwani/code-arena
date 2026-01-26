import { ContestStatus, ContestType, Prisma } from "@prisma/client";
import prisma from "../lib/db";

export const getStats = async () => {

    const [totalContests, totalMcqs, totalDsaProblems, totalParticipants] = await Promise.all([
        prisma.contest.count({}),
        prisma.mcqQuestion.count({}),
        prisma.dsaProblem.count({}),
        prisma.user.count({
            where: {
                role: "contestee",
            },
        }),])

    return {
        totalContests,
        totalMcqs,
        totalDsaProblems,
        totalParticipants,
    };
};
