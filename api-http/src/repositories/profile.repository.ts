import prisma from "../lib/db";

export const getProfileUser = async (userId: number) => {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      imageUrl: true,
      role: true,
      createdAt: true,
    },
  });
};

export const getAttemptsWithContestForProfile = async (userId: number) => {
  return await prisma.contestAttempt.findMany({
    where: { userId },
    include: {
      contest: {
        select: {
          title: true,
          type: true,
          questions: {
            include: {
              mcq: { select: { points: true } },
              dsa: { select: { points: true } },
            },
          },
        },
      },
    },
    orderBy: { startedAt: "desc" },
  });
};

export const getLeaderboardRanksForUser = async (userId: number) => {
  return await prisma.contestLeaderboard.findMany({
    where: { userId },
    select: { rank: true },
  });
};
