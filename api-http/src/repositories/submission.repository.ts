import prisma from "../lib/db";
import { SubmissionStatus } from "@prisma/client";

export const getMcqSubmission = async (
  userId: number,
  questionId: number,
  contestId: number
) => {
  return await prisma.mcqSubmission.findFirst({
    where: {
      userId,
      questionId,
      contestId,
    },
  });
};

export const createMcqSubmission = async (data: {
  userId: number;
  questionId: number;
  contestId: number;
  attemptId: number;
  selectedOptionIndex: number;
  isCorrect: boolean;
  pointsEarned: number;
}) => {
  return await prisma.mcqSubmission.create({
    data: {
      userId: data.userId,
      questionId: data.questionId,
      contestId: data.contestId,
      attemptId: data.attemptId,
      selectedOptionIndex: data.selectedOptionIndex,
      isCorrect: data.isCorrect,
      pointsEarned: data.pointsEarned,
    },
  });
};

export const createDsaSubmission = async (data: {
  userId: number;
  problemId: number;
  contestId: number;
  attemptId: number;
  code: string;
  language: string;
  status: SubmissionStatus;
  pointsEarned: number;
  testCasesPassed: number;
  totalTestCases: number;
}) => {
  return await prisma.dsaSubmission.create({
    data: {
      userId: data.userId,
      problemId: data.problemId,
      contestId: data.contestId,
      attemptId: data.attemptId,
      code: data.code,
      language: data.language,
      status: data.status,
      pointsEarned: data.pointsEarned,
      testCasesPassed: data.testCasesPassed,
      totalTestCases: data.totalTestCases,
    },
  });
};

export const getMcqSubmissionsByContest = async (contestId: number) => {
  return await prisma.mcqSubmission.findMany({
    where: {
      contestId: contestId,
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
      contestId: contestId,
    },
    select: {
      userId: true,
      problemId: true,
      pointsEarned: true,
    },
  });
};
