import { ContestStatus, ContestType, Prisma } from "@prisma/client";
import prisma from "../lib/db";

export const checkIfContestExists = async (contestId: number) => {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: { id: true },
  });

  return Boolean(contest);
};

export const createContest = async (
  data: Prisma.ContestUncheckedCreateInput,
) => {
  return await prisma.contest.create({
    data,
  });
};

export const getContests = async ({
  page,
  limit,
  showAll,
  search,
  status,
  type,
  sortBy,
}: {
  page: number;
  limit: number;
  showAll: boolean;
  search?: string;
  status?: string;
  type?: ContestType;
  sortBy?: string;
}) => {
  const skip = (page - 1) * limit;

  // Build where clause
  const whereConditions: Prisma.ContestWhereInput[] = [];

  // Status filter
  if (!showAll && !status) {
    // Non-creators can only see non-draft and non-cancelled contests by default
    whereConditions.push({
      status:
        ContestStatus.published


    });
  } else if (status && status !== "all") {
    // Map status string to ContestStatus enum
    const statusMap: Record<string, ContestStatus> = {
      draft: ContestStatus.draft,
      published: ContestStatus.published,
      cancelled: ContestStatus.cancelled,
    };

    if (statusMap[status]) {
      const requestedStatus = statusMap[status];

      // Non-creators cannot access draft or cancelled contests
      if (!showAll && requestedStatus !== ContestStatus.published) {
        // Return empty results by using an impossible condition
        whereConditions.push({
          id: -1, // This will never match any contest
        });
      } else {
        whereConditions.push({
          status: requestedStatus,
        });
      }
    }
  } else if (!showAll) {
    // If status is "all" but user is not creator, still filter out draft and cancelled
    whereConditions.push({
      status: ContestStatus.published
    });
  }

  if (type) {
    whereConditions.push({
      type,
    });
  }

  // Search filter
  if (search && search.trim()) {
    whereConditions.push({
      OR: [
        {
          title: {
            contains: search.trim(),
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: search.trim(),
            mode: "insensitive",
          },
        },
      ],
    });
  }

  const where =
    whereConditions.length > 0 ? { AND: whereConditions } : undefined;

  // Build orderBy clause
  let orderBy: Prisma.ContestOrderByWithRelationInput = { createdAt: "desc" };

  if (sortBy) {
    switch (sortBy) {
      case "newest":
        orderBy = { createdAt: "desc" };
        break;
      case "oldest":
        orderBy = { createdAt: "asc" };
        break;
      case "title-asc":
        orderBy = { title: "asc" };
        break;
      case "title-desc":
        orderBy = { title: "desc" };
        break;
      case "status-asc":
        orderBy = { status: "asc" };
        break;
      case "status-desc":
        orderBy = { status: "desc" };
        break;
      default:
        orderBy = { createdAt: "desc" };
    }
  }

  const [contests, totalItems] = await Promise.all([
    prisma.contest.findMany({
      skip,
      take: limit,
      where,
      orderBy,
      select: {
        id: true,
        title: true,
        description: true,
        startTime: true,
        endTime: true,
        maxDurationMs: true,
        type: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        creatorId: true,
        questions: {
          select: {
            mcq: {
              select: {
                id: true,
              },
            },
            dsa: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    }),
    prisma.contest.count({ where }),
  ]);

  return {
    contests,
    totalItems,
  };
};

export const getContestByIdWithProblems = async (contestId: number, includeHiddenTestCases: boolean = false) => {
  return await prisma.contest.findUnique({
    where: { id: contestId },
    include: {
      questions: {
        include: {
          mcq: {
            select: {
              id: true,
              questionText: true,
              options: true,
              correctOptionIndex: true,
              points: true,
              maxDurationMs: true,
              createdAt: true,
              updatedAt: true,
              creatorId: true,
            },
          },
          dsa: {
            select: {
              id: true,
              title: true,
              description: true,
              tags: true,
              points: true,
              timeLimit: true,
              memoryLimit: true,
              difficulty: true,
              maxDurationMs: true,
              boilerplate: true,
              inputFormat: true,
              outputFormat: true,
              constraints: true,
              createdAt: true,
              updatedAt: true,
              creatorId: true,
              testCases: {
                select: {
                  id: true,
                  input: true,
                  expectedOutput: true,
                  isHidden: true,
                  createdAt: true,
                  problemId: true,
                },
                where: {
                  ...(includeHiddenTestCases ? {} : { isHidden: false }),
                },
              },
            },
          },
        },
        orderBy: {
          order: "asc",
        },
      },
    },
  });
};

export const getContestById = async (contestId: number) => {
  return await prisma.contest.findUnique({
    where: { id: contestId },
  });
};

export const getContestQuestionCount = async (contestId: number) => {
  return await prisma.contestQuestion.count({
    where: { contestId },
  });
};

export const updateContest = async (
  contestId: number,
  data: Prisma.ContestUpdateInput,
) => {
  return await prisma.contest.update({
    where: { id: contestId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.startTime !== undefined && { startTime: data.startTime }),
      ...(data.endTime !== undefined && { endTime: data.endTime }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.maxDurationMs !== undefined && {
        maxDurationMs: data.maxDurationMs,
      }),
      ...(data.status !== undefined && { status: data.status }),
    },
  });
};

const dashboardContestSelect = {
  id: true,
  title: true,
  description: true,
  startTime: true,
  endTime: true,
  maxDurationMs: true,
  type: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  creatorId: true,
  questions: {
    select: {
      mcq: { select: { id: true } },
      dsa: { select: { id: true } },
    },
  },
} as const;

export const getDashboardFeedData = async () => {
  const [competitive, practice] = await Promise.all([
    prisma.contest.findMany({
      where: {
        type: ContestType.competitive,
        status: ContestStatus.published,
        endTime: {
          gte: new Date(),
        },
      },
      take: 6,
      orderBy: { startTime: "asc" },
      select: dashboardContestSelect,
    }),
    prisma.contest.findMany({
      where: {
        type: ContestType.practice,
        status: ContestStatus.published,
      },
      take: 6,
      orderBy: { createdAt: "desc" },
      select: dashboardContestSelect,
    }),
  ]);

  return { competitive, practice };
};

export const getOrCreateContestAttempt = async (
  userId: number,
  contestId: number,
) => {
  // Try to find an existing in-progress attempt
  const existingAttempt = await prisma.contestAttempt.findFirst({
    where: {
      userId,
      contestId,
      status: "in_progress",
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
    },
  });
};
