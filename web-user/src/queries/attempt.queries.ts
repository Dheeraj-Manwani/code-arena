import { useQuery } from "@tanstack/react-query";
import { attemptsApi } from "@/api/attempts";
import type {
  AttemptListResponse,
  AttemptResultResponse,
} from "@/schema/attempt.schema";

export const useAttemptsQuery = (page: number, limit: number) => {
  return useQuery({
    queryKey: ["attempts", page, limit],
    queryFn: (): Promise<AttemptListResponse> => attemptsApi.list(page, limit),
    retry: false,
    staleTime: 0,
  });
};

export const useAttemptResultsQuery = (attemptId: number | undefined) => {
  return useQuery({
    queryKey: ["attempt-results", attemptId],
    queryFn: (): Promise<AttemptResultResponse> => {
      if (attemptId == null) throw new Error("Attempt ID is required");
      return attemptsApi.results(attemptId);
    },
    enabled: attemptId != null && !Number.isNaN(attemptId),
    retry: false,
    staleTime: 0,
  });
};
