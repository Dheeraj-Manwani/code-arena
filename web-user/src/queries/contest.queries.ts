import { useQuery } from "@tanstack/react-query";
import { contestApi } from "@/api/contest";
import type {
  Contest,
  ContestListResponse,
  ContestStatus,
  ContestType,
  ContestWithQuestions,
} from "@/schema/contest.schema";

export const useContestsQuery = (
  page: number,
  limit: number,
  search?: string,
  status?: ContestStatus,
  type?: ContestType,
  sortBy?: string,
) => {
  return useQuery({
    queryKey: ["contests", page, limit, search, status, type, sortBy],
    queryFn: async (): Promise<ContestListResponse> => {
      const { data } = await contestApi.getAllContests(
        page,
        limit,
        search,
        status,
        type,
        sortBy,
      );
      return data;
    },
    retry: false,
    staleTime: 0,
  });
};

export const useContestQuery = (
  contestId: number | undefined,
  includeQuestions = false,
) => {
  return useQuery({
    queryKey: ["contest", contestId, includeQuestions],
    queryFn: async (): Promise<Contest | ContestWithQuestions> => {
      if (!contestId) throw new Error("Contest ID is required");
      const { data } = await contestApi.getContestById(
        contestId,
        includeQuestions,
      );
      return data;
    },
    enabled: !!contestId,
    retry: false,
    staleTime: 0,
  });
};
