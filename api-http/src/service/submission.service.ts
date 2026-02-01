import * as submissionRepo from "../repositories/submission.repository";
import * as problemRepo from "../repositories/problem.repository";
import * as contestRepo from "../repositories/contest.repository";
import * as attemptRepo from "../repositories/attempt.repository";
import {
  AttemptNotFoundError,
  QuestionNotFoundError,
  ContestNotActiveError,
  ForbiddenError,
} from "../errors/submission.errors";
import { ProblemNotFoundError } from "../errors/problem.errors";
import {
  SubmitMcqSchemaType,
  SubmitDsaSchemaType,
  ContestAttempt,
} from "../schema/submission.schema";
import { executeCode } from "../util/codeExecutor";
import { Contest, ContestType, Role } from "@prisma/client";
import { AttemptLimitReachedError, ContestNotFoundError } from "../errors/contest.errors";
import { mapDBContestToContest } from "../util/mappers";
import { ContestWithQuestions } from "../schema/contest.schema";
const GRACE_MS = 2000;


export const createAttempt = async (contestId: number, userId: number) => {
  const contest = await contestRepo.getContestById(contestId);

  if (!contest || contest.status !== 'published')
    throw new ContestNotFoundError();

  const now = new Date();
  let deadlineAt: Date | undefined;

  if (contest.type === ContestType.competitive) {

    if (!contest.startTime || !contest.endTime)
      throw new Error("Competitive contest missing time bounds");

    if (now < contest.startTime || now > contest.endTime)
      throw new ContestNotActiveError();

    const attemptCount = await attemptRepo.getContestAttemptCount(userId, contestId);
    if (attemptCount > 0) {
      throw new AttemptLimitReachedError();
    }

    deadlineAt = contest.endTime;
  } else if (contest.maxDurationMs) {

    deadlineAt = new Date(now.getTime() + contest.maxDurationMs);
  } else {
    throw new Error("Practice contest missing maxDurationMs");
  }

  const attempt = await attemptRepo.getOrCreateContestAttempt(userId, contestId, deadlineAt);

  return attempt.id;
}

export const getContestAttempt = async (contestId: number, attemptId: number, role: Role, userId: number): Promise<ContestAttempt> => {
  const contest = await contestRepo.getContestByIdWithProblems(contestId, true);

  if (!contest || contest.status !== 'published') {
    throw new ContestNotFoundError();
  }

  const attempt = await attemptRepo.getContestAttemptById(attemptId);

  if (!attempt || attempt.contestId !== contestId || attempt.userId !== userId) {
    throw new AttemptNotFoundError();
  }

  const draftAnswers = await submissionRepo.getDraftAnswersByAttemptId(attemptId);

  const contestUI = mapDBContestToContest(contest, true, role);

  return {
    id: attempt.id,
    contestId: attempt.contestId,
    status: attempt.status,
    startedAt: attempt.startedAt.toISOString(),
    deadlineAt: attempt.deadlineAt.toISOString(),
    draftAnswers: draftAnswers.map((draftAnswer) => ({
      ...draftAnswer,
      code: draftAnswer.code ?? undefined,
      language: draftAnswer.language ?? undefined,
      mcqOption: draftAnswer.mcqOption ?? undefined,
    })),
    contest: contestUI as ContestWithQuestions
  };
}

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

  // if (existingSubmission) {
  //   throw new AlreadySubmittedError();
  // }

  // Get or create contest attempt
  const attempt = { id: 123 };

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

  const attempt = { id: 123 };

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

export const saveMcqDraft = async (
  contestId: number,
  attemptId: number,
  questionId: number,
  mcqOption: number,
  userId: number
) => {
  const attempt = await attemptRepo.getContestAttemptById(attemptId);
  if (!attempt || attempt.userId !== userId || attempt.contestId !== contestId || attempt.status !== "in_progress") {
    throw new AttemptNotFoundError();
  }
  await submissionRepo.upsertDraftAnswer({
    attemptId,
    problemId: questionId,
    mcqOption,
  });
};

export const saveDsaDraft = async (
  contestId: number,
  attemptId: number,
  problemId: number,
  data: { code: string; language: string },
  userId: number
) => {
  const attempt = await attemptRepo.getContestAttemptById(attemptId);
  if (!attempt || attempt.userId !== userId || attempt.contestId !== contestId || attempt.status !== "in_progress") {
    throw new AttemptNotFoundError();
  }
  await submissionRepo.upsertDraftAnswer({
    attemptId,
    problemId,
    code: data.code,
    language: data.language,
  });
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
