import prisma from "../lib/db";

export const getMcqSubmission = async (userId: number, questionId: number) => {
  return await prisma.mcqSubmission.findUnique({
    where: {
      userId_questionId: {
        userId,
        questionId,
      },
    },
  });
};

export const createMcqSubmission = async (data: {
  userId: number;
  questionId: number;
  selectedOptionIndex: number;
  isCorrect: boolean;
  pointsEarned: number;
}) => {
  return await prisma.mcqSubmission.create({
    data: {
      userId: data.userId,
      questionId: data.questionId,
      selectedOptionIndex: data.selectedOptionIndex,
      isCorrect: data.isCorrect,
      pointsEarned: data.pointsEarned,
    },
  });
};

export const createDsaSubmission = async (data: {
  userId: number;
  problemId: number;
  code: string;
  language: string;
  status: string;
  pointsEarned: number;
  testCasesPassed: number;
  totalTestCases: number;
}) => {
  return await prisma.dsaSubmission.create({
    data: {
      userId: data.userId,
      problemId: data.problemId,
      code: data.code,
      language: data.language,
      status: data.status as any,
      pointsEarned: data.pointsEarned,
      testCasesPassed: data.testCasesPassed,
      totalTestCases: data.totalTestCases,
    },
  });
};

export const getMcqSubmissionsByContest = async (contestId: number) => {
  return await prisma.mcqSubmission.findMany({
    where: {
      question: {
        contestId: contestId,
      },
    },
    select: {
      userId: true,
      pointsEarned: true,
    },
  });
};

export const getDsaSubmissionsByContest = async (contestId: number) => {
  return await prisma.dsaSubmission.findMany({
    where: {
      problem: {
        contestId: contestId,
      },
    },
    select: {
      userId: true,
      problemId: true,
      pointsEarned: true,
    },
  });
};
