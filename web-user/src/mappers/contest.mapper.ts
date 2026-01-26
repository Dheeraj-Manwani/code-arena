import type { Contest, ContestWithDates } from "@/schema/contest.schema";

export const mapApiContestToContest = (apiContest: Contest): ContestWithDates => {
  const startTime = apiContest.startTime ? new Date(apiContest.startTime) : null;
  const endTime = apiContest.endTime ? new Date(apiContest.endTime) : null;
  const createdAt = new Date(apiContest.createdAt);
  const updatedAt = new Date(apiContest.updatedAt);

  return {
    id: apiContest.id,
    title: apiContest.title,
    description: apiContest.description,
    type: apiContest.type,
    status: apiContest.status,
    phase: apiContest.phase,
    startTime,
    endTime,
    maxDurationMs: apiContest.maxDurationMs,
    createdAt,
    updatedAt,
    creatorId: apiContest.creatorId,
    mcqCount: apiContest.mcqCount,
    dsaCount: apiContest.dsaCount,
  };
};