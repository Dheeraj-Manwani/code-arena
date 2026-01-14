import prisma from "../lib/db";

export const getMcqQuestion = async (questionId: number, contestId: number) => {
  return await prisma.mcqQuestion.findFirst({
    where: {
      id: questionId,
      contestId: contestId,
    },
    include: {
      contest: true,
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
      contest: true,
    },
  });
};

export const getDsaProblemWithAllTestCases = async (problemId: number) => {
  return await prisma.dsaProblem.findUnique({
    where: { id: problemId },
    include: {
      contest: true,
      testCases: true,
    },
  });
};

export const createMcqQuestion = async (data: {
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  points: number;
  contestId: number;
}) => {
  return await prisma.mcqQuestion.create({
    data: {
      questionText: data.questionText,
      options: data.options as any,
      correctOptionIndex: data.correctOptionIndex,
      points: data.points,
      contestId: data.contestId,
    },
    select: {
      id: true,
      contestId: true,
    },
  });
};

export const createDsaProblem = async (data: {
  title: string;
  description: string;
  tags: string[];
  points: number;
  timeLimit: number;
  memoryLimit: number;
  contestId: number;
  testCases: Array<{
    input: string;
    expectedOutput: string;
    isHidden: boolean;
  }>;
}) => {
  return await prisma.dsaProblem.create({
    data: {
      title: data.title,
      description: data.description,
      tags: data.tags as any,
      points: data.points,
      timeLimit: data.timeLimit,
      memoryLimit: data.memoryLimit,
      contestId: data.contestId,
      testCases: {
        create: data.testCases.map((tc) => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isHidden: tc.isHidden,
        })),
      },
    },
    select: {
      id: true,
      contestId: true,
    },
  });
};
