import { Prisma } from "@prisma/client";
import prisma from "../lib/db";
import {
  CreateContestInput,
  ContestWithCreator,
  ContestResponse,
} from "../schema/contest.schema";

export const getContests = async (
  take: number,
  skip: number
): Promise<ContestWithCreator[]> => {
  return await prisma.contest.findMany({
    select: contestSelect,
    where: {},
    take,
    skip,
    orderBy: {
      startTime: "desc",
    },
  });
};

export const createContest = async (
  input: CreateContestInput,
  createdById: string
): Promise<ContestResponse> => {
  const contest = await prisma.contest.create({
    data: {
      title: input.title,
      description: input.description,
      startTime: new Date(input.startTime),
      endTime: new Date(input.endTime),
      status: input.status,
      createdById,
    },
    select: contestSelect,
  });

  return contest;
};

export const getContestById = async (
  id: string
): Promise<ContestResponse | null> => {
  const contest = await prisma.contest.findUnique({
    where: { id },
    select: contestSelect,
  });

  return contest;
};

export const updateContest = async (
  id: string,
  data: Prisma.ContestUpdateInput
) => {
  return prisma.contest.update({
    where: { id },
    data,
    select: contestSelect,
  });
};

const contestSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  startTime: true,
  endTime: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: { name: true },
  },
};
