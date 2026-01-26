import * as contestRepo from "../repositories/contest.repository";
import * as problemRepo from "../repositories/problem.repository";
import { ContestNotFoundError, ForbiddenError } from "../errors/contest.errors";
import {
  CreateContestInput,
  UpdateContestInput,
  ContestPhase,
} from "../schema/contest.schema";
import { ContestType, Prisma, Role, ContestStatus } from "@prisma/client";
import { AddDsaType, AddMcqType } from "../schema/problem.schema";

export const getAllContests = async (
  page: number,
  limit: number,
  userRole: Role,
  search?: string,
  status?: ContestStatus,
  type?: ContestType,
  sortBy?: string,
) => {
  const { contests, totalItems } = await contestRepo.getContests({
    page,
    limit,
    showAll: userRole === Role.creator,
    search,
    status,
    type,
    sortBy,
  });

  const totalPages = Math.ceil(totalItems / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  // Transform contests to match ContestSchema (calculate counts and convert dates to ISO strings)
  const formattedContests = contests.map((contest) => {
    const mcqCount = contest.questions.filter((q) => q.mcq !== null).length;
    const dsaCount = contest.questions.filter((q) => q.dsa !== null).length;

    const phase = getContestPhase(contest.startTime, contest.endTime);

    return {
      id: contest.id,
      title: contest.title,
      description: contest.description,
      startTime: contest.startTime?.toISOString() ?? null,
      endTime: contest.endTime?.toISOString() ?? null,
      maxDurationMs: contest.maxDurationMs,
      type: contest.type,
      status: contest.status,
      phase: phase,
      createdAt: contest.createdAt.toISOString(),
      updatedAt: contest.updatedAt.toISOString(),
      creatorId: contest.creatorId,
      mcqCount,
      dsaCount,
    };
  });

  return {
    contests: formattedContests,
    meta: {
      totalItems,
      page,
      limit,
      hasNext,
      hasPrev,
    },
  };
};

export const createContest = async (
  input: CreateContestInput,
  creatorId: number,
) => {
  const { startTime, endTime, questions, ...contestData } = input;

  const contest = await contestRepo.createContest({
    ...contestData,
    startTime: startTime ? new Date(startTime) : undefined,
    endTime: endTime ? new Date(endTime) : undefined,
    creatorId,
  });

  // Link questions to contest if provided
  if (questions && questions.length > 0) {
    await Promise.all(
      questions.map((question) => {
        if (question.type === "mcq") {
          return problemRepo.linkMcqToContest(
            contest.id,
            question.id,
            question.order,
          );
        } else if (question.type === "dsa") {
          return problemRepo.linkDsaToContest(
            contest.id,
            question.id,
            question.order,
          );
        }
      }),
    );
  }

  return contest;
};

export const getContestById = async (
  contestId: number,
  includeQuestions: boolean = false,
  userRole?: Role,
) => {
  const contest = await contestRepo.getContestByIdWithProblems(contestId, userRole === Role.creator);

  if (!contest) {
    throw new ContestNotFoundError();
  }

  // Restrict access: Non-creators cannot access draft or cancelled contests
  if (
    userRole !== Role.creator &&
    (contest.status === ContestStatus.draft ||
      contest.status === ContestStatus.cancelled)
  ) {
    throw new ForbiddenError();
  }

  // Calculate mcqCount and dsaCount
  const mcqCount = contest.questions.filter((q) => q.mcq !== null).length;
  const dsaCount = contest.questions.filter((q) => q.dsa !== null).length;

  const phase =
    contest.type === ContestType.practice
      ? ("running" as const)
      : getContestPhase(contest.startTime, contest.endTime);

  // Base contest data matching ContestSchema
  const baseContest = {
    id: contest.id,
    title: contest.title,
    description: contest.description,
    startTime: contest.startTime?.toISOString() ?? null,
    endTime: contest.endTime?.toISOString() ?? null,
    maxDurationMs: contest.maxDurationMs,
    type: contest.type,
    status: contest.status,
    phase,
    createdAt: contest.createdAt.toISOString(),
    updatedAt: contest.updatedAt.toISOString(),
    creatorId: contest.creatorId,
    mcqCount,
    dsaCount,
  };


  // If questions should be included, format them according to ContestWithQuestionsSchema
  if (includeQuestions && (userRole === Role.creator || contest.type === ContestType.practice)) {
    const formattedQuestions = contest.questions
      .sort((a, b) => a.order - b.order)
      .map((q) => {
        const questionBase = {
          id: q.id,
          order: q.order,
          type: q.mcq ? "mcq" : "dsa",
        };

        if (q.mcq) {
          // Format MCQ question
          const mcq = {
            id: q.mcq.id,
            questionText: q.mcq.questionText,
            options: Array.isArray(q.mcq.options)
              ? q.mcq.options
              : typeof q.mcq.options === "string"
                ? JSON.parse(q.mcq.options)
                : [],
            correctOptionIndex: q.mcq.correctOptionIndex,
            points: q.mcq.points,
            maxDurationMs: q.mcq.maxDurationMs ?? undefined,
            createdAt: q.mcq.createdAt.toISOString(),
            updatedAt: q.mcq.updatedAt.toISOString(),
            creatorId: q.mcq.creatorId,
          };
          return {
            ...questionBase,
            mcq,
          };
        } else if (q.dsa) {
          // Format DSA problem
          const dsa = {
            id: q.dsa.id,
            title: q.dsa.title,
            description: q.dsa.description,
            tags: q.dsa.tags,
            points: q.dsa.points,
            timeLimit: q.dsa.timeLimit,
            memoryLimit: q.dsa.memoryLimit,
            difficulty: q.dsa.difficulty ?? undefined,
            maxDurationMs: q.dsa.maxDurationMs ?? undefined,
            boilerplate: (q.dsa.boilerplate && typeof q.dsa.boilerplate === "object" && !Array.isArray(q.dsa.boilerplate))
              ? (q.dsa.boilerplate as Record<string, string>)
              : {},
            inputFormat: q.dsa.inputFormat ?? null,
            outputFormat: q.dsa.outputFormat ?? null,
            constraints: q.dsa.constraints ?? [],
            createdAt: q.dsa.createdAt.toISOString(),
            updatedAt: q.dsa.updatedAt.toISOString(),
            creatorId: q.dsa.creatorId,
            testCases: q.dsa.testCases.map((tc) => ({
              id: tc.id,
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              isHidden: tc.isHidden,
              createdAt: tc.createdAt.toISOString(),
              problemId: tc.problemId,
            })),
          };
          return {
            ...questionBase,
            dsa,
          };
        }
        return questionBase;
      });

    return {
      ...baseContest,
      questions: formattedQuestions,
    };
  }

  return baseContest;
};

export const addMcqToContest = async (
  contestId: number,
  input: AddMcqType,
  creatorId: number,
) => {
  const contestExists = await contestRepo.checkIfContestExists(contestId);

  if (!contestExists) {
    throw new ContestNotFoundError();
  }

  const maxOrder = await problemRepo.getMaxQuestionOrder(contestId);
  const nextOrder = (maxOrder?.order ?? -1) + 1;

  const mcq = await problemRepo.createMcqQuestion({
    ...input,
    contestId,
    creatorId,
    order: nextOrder,
  });

  return mcq;
};

export const addDsaToContest = async (
  contestId: number,
  input: AddDsaType,
  creatorId: number,
) => {
  const contestExists = await contestRepo.checkIfContestExists(contestId);

  if (!contestExists) {
    throw new ContestNotFoundError();
  }

  const { testCases, ...problemData } = input;

  const dsaProblem = await problemRepo.createDsaProblem(
    {
      ...problemData,
      contestId,
      creatorId,
    },
    testCases.map((tc) => ({
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      isHidden: tc.isHidden,
    })),
  );

  return dsaProblem;
};

export const updateContest = async (
  contestId: number,
  input: UpdateContestInput,
) => {
  const contestExists = await contestRepo.checkIfContestExists(contestId);

  if (!contestExists) {
    throw new ContestNotFoundError();
  }

  const { questions, ...contestData } = input;

  const updateData: Prisma.ContestUpdateInput = {};

  if (contestData.title !== undefined) {
    updateData.title = contestData.title;
  }
  if (contestData.description !== undefined) {
    updateData.description = contestData.description;
  }
  if (contestData.startTime !== undefined) {
    updateData.startTime =
      contestData.startTime === null ? null : new Date(contestData.startTime);
  }
  if (contestData.endTime !== undefined) {
    updateData.endTime =
      contestData.endTime === null ? null : new Date(contestData.endTime);
  }
  if (contestData.type !== undefined) {
    updateData.type = contestData.type;
  }

  if (contestData.maxDurationMs !== undefined) {
    updateData.maxDurationMs = contestData.maxDurationMs;
  }
  if (contestData.status !== undefined) {
    updateData.status = contestData.status;
  }

  const updatedContest = await contestRepo.updateContest(contestId, updateData);

  // Handle questions update if provided
  // If questions is undefined, don't update questions
  // If questions is an array (even empty), update questions accordingly
  if (questions !== undefined) {
    // Remove all existing questions
    await problemRepo.unlinkAllQuestionsFromContest(contestId);

    // Add new questions with proper ordering (if any)
    if (questions.length > 0) {
      await Promise.all(
        questions.map((question) => {
          if (question.type === "mcq") {
            return problemRepo.linkMcqToContest(
              contestId,
              question.id,
              question.order,
            );
          } else if (question.type === "dsa") {
            return problemRepo.linkDsaToContest(
              contestId,
              question.id,
              question.order,
            );
          }
        }),
      );
    }
  }

  return updatedContest;
};

export const linkMcqToContest = async (
  contestId: number,
  questionId: number,
  order: number,
) => {
  const contestExists = await contestRepo.checkIfContestExists(contestId);

  if (!contestExists) {
    throw new ContestNotFoundError();
  }

  // Verify question exists
  const question = await problemRepo.getMcqQuestionById(questionId);
  if (!question) {
    throw new ContestNotFoundError(); // Or create QuestionNotFoundError
  }

  return await problemRepo.linkMcqToContest(contestId, questionId, order);
};

export const linkDsaToContest = async (
  contestId: number,
  problemId: number,
  order: number,
) => {
  const contestExists = await contestRepo.checkIfContestExists(contestId);

  if (!contestExists) {
    throw new ContestNotFoundError();
  }

  // Verify problem exists
  const problem = await problemRepo.getDsaProblemById(problemId);
  if (!problem) {
    throw new ContestNotFoundError(); // Or create ProblemNotFoundError
  }

  return await problemRepo.linkDsaToContest(contestId, problemId, order);
};

export const unlinkMcqFromContest = async (
  contestId: number,
  questionId: number,
) => {
  const contestExists = await contestRepo.checkIfContestExists(contestId);
  if (!contestExists) {
    throw new ContestNotFoundError();
  }

  return await problemRepo.unlinkMcqFromContest(contestId, questionId);
};

export const unlinkDsaFromContest = async (
  contestId: number,
  problemId: number,
) => {
  const contestExists = await contestRepo.checkIfContestExists(contestId);
  if (!contestExists) {
    throw new ContestNotFoundError();
  }

  return await problemRepo.unlinkDsaFromContest(contestId, problemId);
};

export const reorderContestQuestions = async (
  contestId: number,
  questionOrders: Array<{ id: number; isMcq: boolean; order: number }>,
) => {
  const contestExists = await contestRepo.checkIfContestExists(contestId);
  if (!contestExists) {
    throw new ContestNotFoundError();
  }

  return await problemRepo.reorderContestQuestions(contestId, questionOrders);
};

const getContestPhase = (startTime: Date | null, endTime: Date | null): ContestPhase | undefined => {
  if (!startTime || !endTime) {
    return;
  }

  const now = new Date();
  if (now < startTime) {
    return "upcoming";
  }
  if (now >= startTime && now <= endTime) {
    return "running";
  }
  if (now > endTime) {
    return "ended";
  }
};

const formatContestForResponse = (
  contest: {
    id: number;
    title: string;
    description: string;
    startTime: Date | null;
    endTime: Date | null;
    maxDurationMs: number | null;
    type: ContestType;
    status: ContestStatus;
    createdAt: Date;
    updatedAt: Date;
    creatorId: number;
    questions: Array<{ mcq: { id: number } | null; dsa: { id: number } | null }>;
  },
  phase: ContestPhase | undefined,
) => {
  const mcqCount = contest.questions.filter((q) => q.mcq !== null).length;
  const dsaCount = contest.questions.filter((q) => q.dsa !== null).length;
  return {
    id: contest.id,
    title: contest.title,
    description: contest.description,
    startTime: contest.startTime?.toISOString() ?? null,
    endTime: contest.endTime?.toISOString() ?? null,
    maxDurationMs: contest.maxDurationMs,
    type: contest.type,
    status: contest.status,
    phase,
    createdAt: contest.createdAt.toISOString(),
    updatedAt: contest.updatedAt.toISOString(),
    creatorId: contest.creatorId,
    mcqCount,
    dsaCount,
  };
};

export const getDashboardFeed = async () => {
  const { competitive, practice } = await contestRepo.getDashboardFeedData();

  const competitiveWithPhase = competitive
    .map((c) => ({
      ...c,
      phase: getContestPhase(c.startTime, c.endTime) as ContestPhase | undefined,
    }))
    .filter((c) => c.phase === "running" || c.phase === "upcoming");

  const running = competitiveWithPhase
    .filter((c) => c.phase === "running")
    .sort((a, b) => (a.endTime?.getTime() ?? 0) - (b.endTime?.getTime() ?? 0));
  const upcoming = competitiveWithPhase
    .filter((c) => c.phase === "upcoming")
    .sort((a, b) => (a.startTime?.getTime() ?? 0) - (b.startTime?.getTime() ?? 0));

  const featuredCompetitive =
    running.length > 0
      ? formatContestForResponse(running[0], "running")
      : null;

  const latestCompetitive = [
    ...(featuredCompetitive ? running.slice(1) : running),
    ...upcoming,
  ]
    .map((c) => formatContestForResponse(c, c.phase))
    .slice(0, 6);

  const latestPractice = practice.map((c) =>
    formatContestForResponse(c, "running"),
  );

  return {
    featuredCompetitive,
    latestCompetitive,
    latestPractice,
  };
};