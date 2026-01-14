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

export const submitMcq = async (
  contestId: number,
  questionId: number,
  userId: number,
  input: SubmitMcqSchemaType
) => {
  const { selectedOptionIndex } = input;

  const question = await problemRepo.getMcqQuestion(questionId, contestId);

  if (!question) {
    throw new QuestionNotFoundError();
  }

  const now = new Date();
  if (now < question.contest.startTime || now > question.contest.endTime) {
    throw new ContestNotActiveError();
  }

  if (question.contest.creatorId === userId) {
    throw new ForbiddenError();
  }

  const existingSubmission = await submissionRepo.getMcqSubmission(
    userId,
    questionId
  );

  if (existingSubmission) {
    throw new AlreadySubmittedError();
  }

  const isCorrect = selectedOptionIndex === question.correctOptionIndex;
  const pointsEarned = isCorrect ? question.points : 0;

  await submissionRepo.createMcqSubmission({
    userId,
    questionId,
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

  if (!problem) {
    throw new ProblemNotFoundError();
  }

  const now = new Date();
  if (now < problem.contest.startTime || now > problem.contest.endTime) {
    throw new ContestNotActiveError();
  }

  if (problem.contest.creatorId === userId) {
    throw new ForbiddenError();
  }

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
