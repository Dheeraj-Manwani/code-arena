import {
  PaginationQuery,
  UpdateContestInput,
} from "./../schema/contest.schema";
import * as contestRepo from "../repositories/contest.repository";
import {
  CreateContestInput,
  ContestWithCreator,
  ContestResponse,
} from "../schema/contest.schema";
import { Prisma } from "@prisma/client";
import {
  ContestEndedAndCannotBeUpdatedError,
  ContestNotFoundError,
  ContestRunningAndCannotBeUpdatedError,
} from "../errors/contest.errors";

export const getContests = async (
  query: PaginationQuery
): Promise<ContestWithCreator[]> => {
  const { take = 10, skip = 0 } = query;
  return await contestRepo.getContests(take, skip);
};

export const createContest = async (
  input: CreateContestInput,
  createdById: string
): Promise<ContestResponse> => {
  return await contestRepo.createContest(input, createdById);
};

export const getContestById = async (
  id: string
): Promise<ContestResponse | null> => {
  return await contestRepo.getContestById(id);
};

export const updateContest = async (contestId: string, data: any) => {
  const contest = await contestRepo.getContestById(contestId);

  if (!contest) {
    throw new ContestNotFoundError();
  }

  if (contest.status === "ENDED") {
    throw new ContestEndedAndCannotBeUpdatedError();
  }

  const now = new Date();

  const isRunning =
    "RUNNING" === contest.status ||
    (now >= contest.startTime && now <= contest.endTime);

  if (isRunning) {
    throw new ContestRunningAndCannotBeUpdatedError();
  }

  return contestRepo.updateContest(contestId, buildPatchData(data));
};

const buildPatchData = (
  input: UpdateContestInput
): Prisma.ContestUpdateInput => {
  const data: Prisma.ContestUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.status !== undefined) data.status = input.status;
  if (input.startTime !== undefined) data.startTime = new Date(input.startTime);
  if (input.endTime !== undefined) data.endTime = new Date(input.endTime);
  return data;
};
