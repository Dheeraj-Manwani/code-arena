import prisma from "../lib/db";
import { SubmissionStatus } from "@prisma/client";

/**
 * Practice submissions and drafts (PRACTICE_MODE_AND_NAVIGATION.md §4.1, §4.7).
 *
 * Nothing here touches ContestAttempt, ContestLeaderboard, or the contest
 * submission tables — that separation is the whole point of the split.
 */

export const createPracticeSubmission = async (data: {
  userId: number;
  problemId: number;
  code: string;
  language: string;
  totalTestCases: number;
}) => {
  return await prisma.practiceSubmission.create({
    data: {
      userId: data.userId,
      problemId: data.problemId,
      code: data.code,
      language: data.language,
      status: "pending",
      testCasesPassed: 0,
      totalTestCases: data.totalTestCases,
    },
  });
};

/**
 * Apply a judge verdict to a practice submission.
 *
 * No score increment and no leaderboard write: practice is unscored, so the
 * verdict's `pointsEarned` is intentionally dropped.
 */
export const applyPracticeVerdict = async (
  practiceSubmissionId: number,
  verdict: {
    status: SubmissionStatus;
    testCasesPassed: number;
    totalTestCases: number;
    executionTime: number | null;
  },
) => {
  return await prisma.practiceSubmission.update({
    where: { id: practiceSubmissionId },
    data: {
      status: verdict.status,
      testCasesPassed: verdict.testCasesPassed,
      totalTestCases: verdict.totalTestCases,
      executionTime: verdict.executionTime,
    },
  });
};

export const getPracticeSubmissionById = async (
  practiceSubmissionId: number,
  userId: number,
) => {
  return await prisma.practiceSubmission.findFirst({
    where: { id: practiceSubmissionId, userId },
  });
};

/** A user's submission history for one problem, newest first. */
export const getPracticeSubmissionsForProblem = async (
  userId: number,
  problemId: number,
  limit: number,
) => {
  return await prisma.practiceSubmission.findMany({
    where: { userId, problemId },
    orderBy: { submittedAt: "desc" },
    take: limit,
    select: {
      id: true,
      status: true,
      language: true,
      testCasesPassed: true,
      totalTestCases: true,
      executionTime: true,
      submittedAt: true,
    },
  });
};

/**
 * All `pending` practice submissions with the problem data needed to rebuild a
 * judge job. The practice half of the boot reconciler — without this, a crash
 * mid-judge leaves a practice submission `pending` forever, since the existing
 * sweep only looks at `DsaSubmission`.
 */
export const getPendingPracticeSubmissionsWithProblem = async () => {
  return await prisma.practiceSubmission.findMany({
    where: { status: "pending" },
    include: {
      problem: {
        include: { testCases: true },
      },
    },
  });
};

export const getPracticeDraft = async (userId: number, problemId: number) => {
  return await prisma.practiceDraft.findUnique({
    where: { userId_problemId: { userId, problemId } },
  });
};

export const upsertPracticeDraft = async (data: {
  userId: number;
  problemId: number;
  code: string;
  language: string;
}) => {
  return await prisma.practiceDraft.upsert({
    where: {
      userId_problemId: { userId: data.userId, problemId: data.problemId },
    },
    create: data,
    update: { code: data.code, language: data.language },
  });
};
