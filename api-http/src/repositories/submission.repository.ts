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

export const getMcqSubmissionByAttempt = async (
  attemptId: number,
  questionId: number
) => {
  return await prisma.mcqSubmission.findUnique({
    where: {
      attemptId_questionId: { attemptId, questionId },
    },
  });
};

export const getDsaSubmissionByAttempt = async (
  attemptId: number,
  problemId: number
) => {
  return await prisma.dsaSubmission.findUnique({
    where: {
      attemptId_problemId: { attemptId, problemId },
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

export const getDraftAnswersByAttemptId = async (attemptId: number) => {
  return await prisma.draftAnswer.findMany({
    where: { attemptId },
    orderBy: { id: "asc" },
  });
};

export const upsertDraftAnswer = async (data: {
  attemptId: number;
  problemId: number;
  mcqOption?: number;
  code?: string;
  language?: string;
}) => {
  return await prisma.draftAnswer.upsert({
    where: {
      attemptId_problemId: {
        attemptId: data.attemptId,
        problemId: data.problemId,
      },
    },
    create: {
      attemptId: data.attemptId,
      problemId: data.problemId,
      mcqOption: data.mcqOption ?? null,
      code: data.code ?? null,
      language: data.language ?? null,
    },
    update: {
      ...(data.mcqOption !== undefined && { mcqOption: data.mcqOption }),
      ...(data.code !== undefined && { code: data.code }),
      ...(data.language !== undefined && { language: data.language }),
    },
  });
};