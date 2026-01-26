import api from "@/lib/axios";
import type { LeaderboardResponse } from "@/schema/leaderboard.schema";

export const leaderboardApi = {
  getLeaderboard: async (contestId: number): Promise<LeaderboardResponse> => {
    const res = await api.get(`/api/contests/${contestId}/leaderboard`);
    return res.data;
  },
};
