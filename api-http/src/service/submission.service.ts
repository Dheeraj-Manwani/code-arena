import * as submissionRepo from "../repositories/submission.repository";
import * as contestRepo from "../repositories/contest.repository";
import * as attemptRepo from "../repositories/attempt.repository";
import {
  AttemptNotFoundError,
  QuestionNotFoundError,
  ContestNotActiveError,
  ForbiddenError,
  AlreadySubmittedError,
} from "../errors/submission.errors";
import { ProblemNotFoundError } from "../errors/problem.errors";
import {
  SubmitMcqSchemaType,
  SubmitDsaSchemaType,
  ContestAttempt,
} from "../schema/submission.schema";
import { LanguageEnum, type Language } from "../schema/language.schema";
import { enqueueJudgeJob } from "../lib/judgeQueue";
import type { BoilerplateSignature } from "../util/boilerplate/types";
import type { SerializedTestCase } from "../util/boilerplate";
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

export const getContestAttempt = async (
  contestId: number,
  attemptId: number,
  role: Role,
  userId: number,
): Promise<ContestAttempt> => {
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

  const attemptWithCurrent = attempt as typeof attempt & { currentProblemId?: number | null };
  const currentProblemId = attemptWithCurrent.currentProblemId ?? undefined;

  return {
    id: attempt.id,
    contestId: attempt.contestId,
    status: attempt.status,
    startedAt: attempt.startedAt.toISOString(),
    deadlineAt: attempt.deadlineAt.toISOString(),
    currentProblemId,
    draftAnswers: draftAnswers.map((draftAnswer) => {
      const parsedLang =
        draftAnswer.language != null
          ? LanguageEnum.safeParse(draftAnswer.language)
          : { success: false as const };
      return {
        ...draftAnswer,
        code: draftAnswer.code ?? undefined,
        language: parsedLang.success ? parsedLang.data : undefined,
        mcqOption: draftAnswer.mcqOption ?? undefined,
      };
    }),
    contest: contestUI as ContestWithQuestions
  };
}

export const submitMcq = async (
  contestId: number,
  attemptId: number,
  contestQuestionId: number,
  userId: number,
  input: SubmitMcqSchemaType
) => {
  const { selectedOptionIndex } = input;

  const attempt = await attemptRepo.getContestAttemptById(attemptId);
  if (
    !attempt ||
    attempt.contestId !== contestId ||
    attempt.userId !== userId ||
    attempt.status !== "in_progress"
  ) {
    throw new AttemptNotFoundError();
  }

  const contestQuestion = await contestRepo.getContestQuestionWithMcq(
    contestQuestionId,
    contestId
  );
  if (!contestQuestion?.mcq) {
    throw new QuestionNotFoundError();
  }
  const { mcq: question } = contestQuestion;
  const mcqId = question.id;
  const contest = contestQuestion.contest;

  if (!isContestActive(contest)) {
    throw new ContestNotActiveError();
  }

  const existingSubmission = await submissionRepo.getMcqSubmissionByAttempt(
    attemptId,
    mcqId
  );

  if (existingSubmission) {
    throw new AlreadySubmittedError();
  }

  const isCorrect = selectedOptionIndex === question.correctOptionIndex;
  const pointsEarned = isCorrect ? question.points : 0;

  await submissionRepo.createMcqSubmission({
    userId,
    questionId: mcqId,
    contestId,
    attemptId: attempt.id,
    selectedOptionIndex,
    isCorrect,
    pointsEarned,
  });

  const nextContestQuestionId = await contestRepo.getNextContestQuestionIdAfter(
    contestId,
    contestQuestionId
  );
  await attemptRepo.updateCurrentProblemId(
    attempt.id,
    userId,
    contestId,
    nextContestQuestionId
  );

  return {
    isCorrect,
    pointsEarned,
  };
};

export const submitDsa = async (
  contestId: number,
  attemptId: number,
  contestQuestionId: number,
  userId: number,
  input: SubmitDsaSchemaType
) => {
  const { code, language } = input;

  const attempt = await attemptRepo.getContestAttemptById(attemptId);
  if (
    !attempt ||
    attempt.contestId !== contestId ||
    attempt.userId !== userId ||
    attempt.status !== "in_progress"
  ) {
    throw new AttemptNotFoundError();
  }

  const contestQuestion = await contestRepo.getContestQuestionWithDsa(
    contestQuestionId,
    contestId
  );
  if (!contestQuestion?.dsa) {
    throw new ProblemNotFoundError();
  }
  const problem = contestQuestion.dsa;
  const dsaId = problem.id;
  const contest = contestQuestion.contest;

  if (!isContestActive(contest)) {
    throw new ContestNotActiveError();
  }

  const existingSubmission = await submissionRepo.getDsaSubmissionByAttempt(
    attemptId,
    dsaId
  );

  if (existingSubmission) {
    throw new AlreadySubmittedError();
  }

  const testCases: SerializedTestCase[] = problem.testCases.map((tc) => ({
    input: tc.input,
    expectedOutput: tc.expectedOutput,
  }));

  const submission = await submissionRepo.createDsaSubmission({
    userId,
    problemId: dsaId,
    contestId,
    attemptId: attempt.id,
    code,
    language,
    status: "pending",
    pointsEarned: 0,
    testCasesPassed: 0,
    totalTestCases: testCases.length,
  });

  const signature = problem.signature as unknown as BoilerplateSignature;

  await enqueueJudgeJob({
    dsaSubmissionId: submission.id,
    attemptId: attempt.id,
    userId,
    problemId: dsaId,
    contestId,
    language: language as Language,
    userCode: code,
    signature,
    testCases,
    totalPoints: problem.points,
  });

  const nextContestQuestionId = await contestRepo.getNextContestQuestionIdAfter(
    contestId,
    contestQuestionId
  );
  await attemptRepo.updateCurrentProblemId(
    attempt.id,
    userId,
    contestId,
    nextContestQuestionId
  );

  return {
    status: "pending" as const,
    pointsEarned: 0,
    testCasesPassed: 0,
    totalTestCases: testCases.length,
  };
};

export const saveMcqDraft = async (
  contestId: number,
  attemptId: number,
  contestQuestionId: number,
  mcqOption: number,
  userId: number
) => {
  const attempt = await attemptRepo.getContestAttemptById(attemptId);
  if (!attempt || attempt.userId !== userId || attempt.contestId !== contestId || attempt.status !== "in_progress") {
    throw new AttemptNotFoundError();
  }
  const contestQuestion = await contestRepo.getContestQuestionById(
    contestQuestionId,
    contestId
  );
  if (!contestQuestion || !contestQuestion.mcqId) {
    throw new QuestionNotFoundError();
  }
  await submissionRepo.upsertDraftAnswer({
    attemptId,
    problemId: contestQuestion.mcqId,
    mcqOption,
  });
};

export const saveDsaDraft = async (
  contestId: number,
  attemptId: number,
  contestQuestionId: number,
  data: { code: string; language: string },
  userId: number
) => {
  const attempt = await attemptRepo.getContestAttemptById(attemptId);
  if (!attempt || attempt.userId !== userId || attempt.contestId !== contestId || attempt.status !== "in_progress") {
    throw new AttemptNotFoundError();
  }
  const contestQuestion = await contestRepo.getContestQuestionById(
    contestQuestionId,
    contestId
  );
  if (!contestQuestion || !contestQuestion.dsaId) {
    throw new ProblemNotFoundError();
  }
  await submissionRepo.upsertDraftAnswer({
    attemptId,
    problemId: contestQuestion.dsaId,
    code: data.code,
    language: data.language,
  });
};

export const submitContest = async (
  contestId: number,
  attemptId: number,
  userId: number
) => {
  const attempt = await attemptRepo.getContestAttemptById(attemptId);
  if (!attempt || attempt.userId !== userId || attempt.contestId !== contestId) {
    throw new AttemptNotFoundError();
  }
  if (attempt.status !== "in_progress") {
    throw new AttemptNotFoundError();
  }
  const updated = await attemptRepo.markAttemptSubmitted(attemptId, userId, contestId);
  if (!updated) {
    throw new AttemptNotFoundError();
  }
  return { success: true };
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
