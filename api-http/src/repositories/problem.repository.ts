import { Prisma } from "@prisma/client";
import prisma from "../lib/db";
import { AddTestCaseType } from "../schema/contest.schema";

export const getMcqQuestion = async (questionId: number, contestId: number) => {
  return await prisma.mcqQuestion.findFirst({
    where: {
      id: questionId,
      contestLinks: {
        some: {
          contestId,
        },
      },
    },
    include: {
      contestLinks: {
        where: {
          contestId: contestId,
        },
        include: {
          contest: true,
        },
      },
    },
  });
};

export const getDsaProblem = async (problemId: number) => {
  return await prisma.dsaProblem.findUnique({
    where: { id: problemId },
    include: {
      testCases: {
        where: {
          isHidden: false,
        },
        select: {
          input: true,
          expectedOutput: true,
        },
      },
      contestLinks: {
        include: {
          contest: true,
        },
      },
    },
  });
};

export const getDsaProblemWithAllTestCases = async (problemId: number) => {
  return await prisma.dsaProblem.findUnique({
    where: { id: problemId },
    include: {
      contestLinks: {
        include: {
          contest: true,
        },
      },
      testCases: true,
    },
  });
};

export const getMaxQuestionOrder = async (contestId: number) => {
  return await prisma.contestQuestion.findFirst({
    where: { contestId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
};

export const createMcqQuestion = async (data: Prisma.McqQuestionUncheckedCreateInput & { contestId: number, creatorId: number, order: number }) => {

  const mcq = await prisma.mcqQuestion.create({
    data: {
      questionText: data.questionText,
      options: data.options,
      correctOptionIndex: data.correctOptionIndex,
      points: data.points,
      contestLinks: {
        create: {
          contestId: data.contestId,
          order: data.order,
        },
      },
      creatorId: data.creatorId,
    },

  });

  return {
    id: mcq.id,
    contestId: data.contestId,
  };
};

export const createDsaProblem = async (data: Prisma.DsaProblemUncheckedCreateInput & { contestId: number, creatorId: number }, testCases: AddTestCaseType) => {
  const maxOrder = await prisma.contestQuestion.findFirst({
    where: { contestId: data.contestId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const nextOrder = (maxOrder?.order ?? -1) + 1;

  const dsaProblem = await prisma.dsaProblem.create({
    data: {
      ...data,
      testCases: {
        create: testCases.map((tc) => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isHidden: tc.isHidden,
        })),
      },
      contestLinks: {
        create: {
          contestId: data.contestId,
          order: nextOrder,
        },
      },
    },
  });

  return {
    id: dsaProblem.id,
    contestId: data.contestId,
  };
};

export const createStandaloneMcqQuestion = async (data: Prisma.McqQuestionUncheckedCreateInput & { creatorId: number }) => {
  const mcq = await prisma.mcqQuestion.create({
    data: {
      questionText: data.questionText,
      options: data.options,
      correctOptionIndex: data.correctOptionIndex,
      points: data.points,
      maxDurationMs: data.maxDurationMs,
      creatorId: data.creatorId,
    },
  });

  return mcq;
};

export const createStandaloneDsaProblem = async (data: Prisma.DsaProblemUncheckedCreateInput & { creatorId: number }, testCases: AddTestCaseType) => {
  const dsaProblem = await prisma.dsaProblem.create({
    data: {
      ...data,
      testCases: {
        create: testCases.map((tc) => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isHidden: tc.isHidden,
        })),
      },
    },
  });

  return dsaProblem;
};

export const updateMcqQuestion = async (questionId: number, data: Prisma.McqQuestionUncheckedUpdateInput) => {
  const mcq = await prisma.mcqQuestion.update({
    where: { id: questionId },
    data,
  });

  return mcq;
};

export const updateDsaProblem = async (problemId: number, data: Prisma.DsaProblemUncheckedUpdateInput, testCases?: AddTestCaseType) => {
  // If testCases are provided and not empty, delete existing ones and create new ones
  // If testCases is undefined or empty array, keep existing test cases
  if (testCases !== undefined && testCases.length > 0) {
    await prisma.testCase.deleteMany({
      where: { problemId },
    });
  }

  const dsaProblem = await prisma.dsaProblem.update({
    where: { id: problemId },
    data: {
      ...data,
      ...(testCases !== undefined && testCases.length > 0 && {
        testCases: {
          create: testCases.map((tc) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isHidden: tc.isHidden,
          })),
        },
      }),
    },
    include: {
      testCases: true,
    },
  });

  return dsaProblem;
};

export const getMcqQuestionById = async (questionId: number) => {
  return await prisma.mcqQuestion.findUnique({
    where: { id: questionId },
  });
};

export const getDsaProblemById = async (problemId: number) => {
  return await prisma.dsaProblem.findUnique({
    where: { id: problemId },
    include: {
      testCases: true,
    },
  });
};

export const linkMcqToContest = async (contestId: number, questionId: number, order: number) => {
  // Check if already linked
  const existing = await prisma.contestQuestion.findFirst({
    where: {
      contestId,
      mcqId: questionId,
    },
  });

  if (existing) {
    return existing;
  }

  return await prisma.contestQuestion.create({
    data: {
      contestId,
      mcqId: questionId,
      order,
    },
  });
};

export const linkDsaToContest = async (contestId: number, problemId: number, order: number) => {
  // Check if already linked
  const existing = await prisma.contestQuestion.findFirst({
    where: {
      contestId,
      dsaId: problemId,
    },
  });

  if (existing) {
    return existing;
  }

  return await prisma.contestQuestion.create({
    data: {
      contestId,
      dsaId: problemId,
      order,
    },
  });
};

export const unlinkMcqFromContest = async (contestId: number, questionId: number) => {
  return await prisma.contestQuestion.deleteMany({
    where: {
      contestId,
      mcqId: questionId,
    },
  });
};

export const unlinkDsaFromContest = async (contestId: number, problemId: number) => {
  return await prisma.contestQuestion.deleteMany({
    where: {
      contestId,
      dsaId: problemId,
    },
  });
};

export const unlinkAllQuestionsFromContest = async (contestId: number) => {
  return await prisma.contestQuestion.deleteMany({
    where: {
      contestId,
    },
  });
};

export const updateQuestionOrder = async (contestId: number, questionId: number, isMcq: boolean, newOrder: number) => {
  const question = await prisma.contestQuestion.findFirst({
    where: {
      contestId,
      ...(isMcq ? { mcqId: questionId } : { dsaId: questionId }),
    },
  });

  if (!question) {
    throw new Error("Question not found in contest");
  }

  return await prisma.contestQuestion.update({
    where: { id: question.id },
    data: { order: newOrder },
  });
};

export const reorderContestQuestions = async (contestId: number, questionOrders: Array<{ id: number; isMcq: boolean; order: number }>) => {
  // Get all contest questions
  const allQuestions = await prisma.contestQuestion.findMany({
    where: { contestId },
  });

  // Update orders
  const updates = questionOrders.map(({ id, isMcq, order }) => {
    const question = allQuestions.find(
      (q) => (isMcq ? q.mcqId === id : q.dsaId === id) && (isMcq ? q.mcqId !== null : q.dsaId !== null)
    );
    if (question) {
      return prisma.contestQuestion.update({
        where: { id: question.id },
        data: { order },
      });
    }
    return Promise.resolve(null);
  });

  await Promise.all(updates);
};

export const getAllMcqQuestions = async (page: number, limit: number, search?: string) => {
  const skip = (page - 1) * limit;
  const where: Prisma.McqQuestionWhereInput = {};

  if (search && search.length > 0) {
    where.questionText = {
      contains: search,
      mode: "insensitive",
    };
  }

  const [questions, total] = await Promise.all([
    prisma.mcqQuestion.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
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
    }),
    prisma.mcqQuestion.count({ where }),
  ]);

  return {
    questions,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getAllDsaProblems = async (page: number, limit: number, search?: string) => {
  const skip = (page - 1) * limit;
  const where: Prisma.DsaProblemWhereInput = {};

  if (search && search.length > 0) {
    // Search in title and description (case-insensitive)
    // For tag search, Prisma's hasSome only does exact matches on arrays,
    // so we search title/description which covers most use cases
    where.OR = [
      {
        title: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  const [problems, total] = await Promise.all([
    prisma.dsaProblem.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
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
        createdAt: true,
        updatedAt: true,
        creatorId: true,
      },
    }),
    prisma.dsaProblem.count({ where }),
  ]);

  return {
    problems,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};