import * as submissionRepo from "../repositories/submission.repository";
import * as problemRepo from "../repositories/problem.repository";
import * as contestRepo from "../repositories/contest.repository";
import {
  QuestionNotFoundError,
  AlreadySubmittedError,
  ContestNotActiveError,
  ForbiddenError,
} from "../errors/submission.errors";
import { ProblemNotFoundError } from "../errors/problem.errors";
import {
  SubmitMcqSchemaType,
  SubmitDsaSchemaType,
} from "../schema/submission.schema";
import { executeCode } from "../util/codeExecutor";
import { Contest, ContestType } from "@prisma/client";

export const submitMcq = async (
  contestId: number,
  questionId: number,
  userId: number,
  input: SubmitMcqSchemaType
) => {
  const { selectedOptionIndex } = input;

  const question = await problemRepo.getMcqQuestion(questionId, contestId);

  if (
    !question ||
    !question.contestLinks ||
    question.contestLinks.length === 0
  ) {
    throw new QuestionNotFoundError();
  }

  const contest = question.contestLinks[0].contest;

  if (!isContestActive(contest)) {
    throw new ContestNotActiveError();
  }

  const existingSubmission = await submissionRepo.getMcqSubmission(
    userId,
    questionId,
    contestId
  );

  if (existingSubmission) {
    throw new AlreadySubmittedError();
  }

  // Get or create contest attempt
  const attempt = await contestRepo.getOrCreateContestAttempt(
    userId,
    contestId
  );

  const isCorrect = selectedOptionIndex === question.correctOptionIndex;
  const pointsEarned = isCorrect ? question.points : 0;

  await submissionRepo.createMcqSubmission({
    userId,
    questionId,
    contestId,
    attemptId: attempt.id,
    selectedOptionIndex,
    isCorrect,
    pointsEarned,
  });

  return {
    isCorrect,
    pointsEarned,
  };
};

export const submitDsa = async (
  problemId: number,
  userId: number,
  input: SubmitDsaSchemaType
) => {
  const { code, language } = input;

  const problem = await problemRepo.getDsaProblemWithAllTestCases(problemId);

  if (!problem || !problem.contestLinks || problem.contestLinks.length === 0) {
    throw new ProblemNotFoundError();
  }

  const contest = problem.contestLinks[0].contest;
  const contestId = contest.id;

  if (!isContestActive(contest)) {
    throw new ContestNotActiveError();
  }

  if (contest.creatorId === userId) {
    throw new ForbiddenError();
  }

  // Get or create contest attempt
  const attempt = await contestRepo.getOrCreateContestAttempt(
    userId,
    contestId
  );

  const executionResult = await executeCode(
    code,
    language,
    problem.testCases.map((tc) => ({
      input: tc.input,
      expectedOutput: tc.expectedOutput,
    })),
    problem.timeLimit
  );

  const pointsEarned = Math.floor(
    (executionResult.testCasesPassed / executionResult.totalTestCases) *
    problem.points
  );

  await submissionRepo.createDsaSubmission({
    userId,
    problemId,
    contestId,
    attemptId: attempt.id,
    code,
    language,
    status: executionResult.status,
    pointsEarned,
    testCasesPassed: executionResult.testCasesPassed,
    totalTestCases: executionResult.totalTestCases,
  });

  return {
    status: executionResult.status,
    pointsEarned,
    testCasesPassed: executionResult.testCasesPassed,
    totalTestCases: executionResult.totalTestCases,
  };
};

const isContestActive = (contest: Contest) => {
  // Practice contests are always active
  if (contest.type === ContestType.practice) {
    return true;
  }

  // Competitive contests must be within start and end time
  if (contest.type === ContestType.competitive) {
    const now = new Date();
    if (!contest.startTime || !contest.endTime) {
      return false;
    }
    return now >= contest.startTime && now <= contest.endTime;
  }

  return false;
};
