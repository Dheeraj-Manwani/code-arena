import { useQuery } from "@tanstack/react-query";
import { leaderboardApi } from "@/api/leaderboard";
import type { LeaderboardEntryApi } from "@/schema/leaderboard.schema";

export const useLeaderboardQuery = (contestId: number | undefined) => {
  return useQuery({
    queryKey: ["leaderboard", contestId],
    queryFn: async (): Promise<LeaderboardEntryApi[]> => {
      if (!contestId) throw new Error("Contest ID is required");
      const res = await leaderboardApi.getLeaderboard(contestId);
      return res.data;
    },
    enabled: !!contestId,
    retry: false,
    staleTime: 0,
  });
};
