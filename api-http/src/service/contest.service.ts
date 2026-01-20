import * as contestRepo from "../repositories/contest.repository";
import * as problemRepo from "../repositories/problem.repository";
import { ContestNotFoundError } from "../errors/contest.errors";
import {
  CreateContestInput,
  UpdateContestInput,
  AddMcqType,
  AddDsaType,
} from "../schema/contest.schema";
import { Prisma, Role } from "@prisma/client";

export const getAllContests = async (
  page: number,
  limit: number,
  userRole: Role,
  search?: string,
  status?: string,
  sortBy?: string
) => {
  const { contests, totalItems } = await contestRepo.getContests({
    page,
    limit,
    showAll: userRole === Role.creator,
    search,
    status,
    sortBy,
  });

  const totalPages = Math.ceil(totalItems / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    contests: contests,
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
  creatorId: number
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
          return problemRepo.linkMcqToContest(contest.id, question.id, question.order);
        } else if (question.type === "dsa") {
          return problemRepo.linkDsaToContest(contest.id, question.id, question.order);
        }
      })
    );
  }

  return contest;
};

export const getContestById = async (contestId: number, includeQuestions: boolean = false) => {
  if (includeQuestions) {
    const contest = await contestRepo.getContestByIdWithProblems(contestId);

    if (!contest) {
      throw new ContestNotFoundError();
    }

    // Map questions with order information
    const mcqs = contest.questions
      .filter((q) => q.mcq !== null)
      .map((q) => ({
        ...q.mcq!,
        order: q.order,
      }));

    const dsaProblems = contest.questions
      .filter((q) => q.dsa !== null)
      .map((q) => ({
        ...q.dsa!,
        order: q.order,
      }));

    const response = {
      id: contest.id,
      title: contest.title,
      description: contest.description,
      startTime: contest.startTime?.toISOString(),
      endTime: contest.endTime?.toISOString(),
      creatorId: contest.creatorId,
      type: contest.type,
      status: contest.status,
      maxDurationMs: contest.maxDurationMs,
      createdAt: contest.createdAt?.toISOString(),
      updatedAt: contest.updatedAt?.toISOString(),
      mcqs,
      dsaProblems,
      questions: contest.questions
        .sort((a, b) => a.order - b.order)
        .map((q) => ({
          id: q.id,
          order: q.order,
          mcq: q.mcq ? { ...q.mcq, order: q.order, type: "mcq" as const } : null,
          dsa: q.dsa ? { ...q.dsa, order: q.order, type: "dsa" as const } : null,
        })),
    };

    return response;
  } else {
    const contest = await contestRepo.getContestById(contestId);

    if (!contest) {
      throw new ContestNotFoundError();
    }

    // Get question count without fetching full question details
    const questionCount = await contestRepo.getContestQuestionCount(contestId);

    const response = {
      id: contest.id,
      title: contest.title,
      description: contest.description,
      startTime: contest.startTime?.toISOString(),
      endTime: contest.endTime?.toISOString(),
      creatorId: contest.creatorId,
      type: contest.type,
      status: contest.status,
      maxDurationMs: contest.maxDurationMs,
      createdAt: contest.createdAt?.toISOString(),
      updatedAt: contest.updatedAt?.toISOString(),
      mcqs: [],
      dsaProblems: [],
      questions: [],
      questionCount, // Include count for display purposes
    };

    return response;
  }
};

export const addMcqToContest = async (
  contestId: number,
  input: AddMcqType,
  creatorId: number
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
  creatorId: number
) => {
  const contestExists = await contestRepo.checkIfContestExists(contestId);

  if (!contestExists) {
    throw new ContestNotFoundError();
  }

  const {

    testCases,
    ...problemData

  } = input;

  const dsaProblem = await problemRepo.createDsaProblem({
    ...problemData,
    contestId,
    creatorId,
  }, testCases.map((tc) => ({
    input: tc.input,
    expectedOutput: tc.expectedOutput,
    isHidden: tc.isHidden,
  })),);

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
    updateData.startTime = contestData.startTime === null ? null : new Date(contestData.startTime);
  }
  if (contestData.endTime !== undefined) {
    updateData.endTime = contestData.endTime === null ? null : new Date(contestData.endTime);
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
            return problemRepo.linkMcqToContest(contestId, question.id, question.order);
          } else if (question.type === "dsa") {
            return problemRepo.linkDsaToContest(contestId, question.id, question.order);
          }
        })
      );
    }
  }

  return updatedContest;
};

export const linkMcqToContest = async (
  contestId: number,
  questionId: number,
  order: number
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
  order: number
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
  questionId: number
) => {
  const contestExists = await contestRepo.checkIfContestExists(contestId);
  if (!contestExists) {
    throw new ContestNotFoundError();
  }

  return await problemRepo.unlinkMcqFromContest(contestId, questionId);
};

export const unlinkDsaFromContest = async (
  contestId: number,
  problemId: number
) => {
  const contestExists = await contestRepo.checkIfContestExists(contestId);
  if (!contestExists) {
    throw new ContestNotFoundError();
  }

  return await problemRepo.unlinkDsaFromContest(contestId, problemId);
};

export const reorderContestQuestions = async (
  contestId: number,
  questionOrders: Array<{ id: number; isMcq: boolean; order: number }>
) => {
  const contestExists = await contestRepo.checkIfContestExists(contestId);
  if (!contestExists) {
    throw new ContestNotFoundError();
  }

  return await problemRepo.reorderContestQuestions(contestId, questionOrders);
};
