import prisma from "../lib/db";

export const createContest = async (data: {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  creatorId: number;
}) => {
  return await prisma.contest.create({
    data: {
      title: data.title,
      description: data.description,
      startTime: data.startTime,
      endTime: data.endTime,
      creatorId: data.creatorId,
    },
    select: {
      id: true,
      title: true,
      description: true,
      creatorId: true,
      startTime: true,
      endTime: true,
    },
  });
};

export const getContestByIdWithProblems = async (contestId: number) => {
  return await prisma.contest.findUnique({
    where: { id: contestId },
    include: {
      mcqs: {
        select: {
          id: true,
          questionText: true,
          options: true,
          points: true,
        },
      },
      dsaProblems: {
        select: {
          id: true,
          title: true,
          description: true,
          tags: true,
          points: true,
          timeLimit: true,
          memoryLimit: true,
        },
      },
    },
  });
};

export const getContestById = async (contestId: number) => {
  return await prisma.contest.findUnique({
    where: { id: contestId },
  });
};
