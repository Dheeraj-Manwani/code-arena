import * as contestRepo from "../repositories/contest.repository";
import * as problemRepo from "../repositories/problem.repository";
import { ContestNotFoundError, ForbiddenError } from "../errors/contest.errors";
import {
  CreateContestSchemaType,
  AddMcqSchemaType,
  AddDsaSchemaType,
} from "../schema/contest.schema";

export const createContest = async (
  input: CreateContestSchemaType,
  creatorId: number
) => {
  const { title, description, startTime, endTime } = input;

  const contest = await contestRepo.createContest({
    title,
    description,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    creatorId,
  });

  return contest;
};

export const getContestById = async (contestId: number) => {
  const contest = await contestRepo.getContestByIdWithProblems(contestId);

  if (!contest) {
    throw new ContestNotFoundError();
  }

  const response = {
    id: contest.id,
    title: contest.title,
    description: contest.description,
    startTime: contest.startTime.toISOString(),
    endTime: contest.endTime.toISOString(),
    creatorId: contest.creatorId,
    mcqs: contest.mcqs,
    dsaProblems: contest.dsaProblems,
  };

  return response;
};

export const addMcqToContest = async (
  contestId: number,
  input: AddMcqSchemaType
) => {
  const contest = await contestRepo.getContestById(contestId);

  if (!contest) {
    throw new ContestNotFoundError();
  }

  const { questionText, options, correctOptionIndex, points } = input;

  const mcq = await problemRepo.createMcqQuestion({
    questionText,
    options,
    correctOptionIndex,
    points,
    contestId,
  });

  return mcq;
};

export const addDsaToContest = async (
  contestId: number,
  input: AddDsaSchemaType
) => {
  const contest = await contestRepo.getContestById(contestId);

  if (!contest) {
    throw new ContestNotFoundError();
  }

  const {
    title,
    description,
    tags,
    points,
    timeLimit,
    memoryLimit,
    testCases,
  } = input;

  const dsaProblem = await problemRepo.createDsaProblem({
    title,
    description,
    tags,
    points,
    timeLimit,
    memoryLimit,
    contestId,
    testCases: testCases.map((tc) => ({
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      isHidden: tc.isHidden,
    })),
  });

  return dsaProblem;
};
