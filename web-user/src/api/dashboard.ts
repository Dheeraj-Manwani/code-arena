import api from "@/lib/axios";
import type { Contest } from "@/schema/contest.schema";

export type DashboardFeed = {
  featuredCompetitive: Contest | null;
  latestCompetitive: Contest[];
  latestPractice: Contest[];
};

export const getDashboardFeed = async (): Promise<DashboardFeed> => {
  const res = await api.get<{ success: boolean; data: DashboardFeed }>(
    "/api/dashboard-feed",
  );
  return (
    res.data.data ?? {
      featuredCompetitive: null,
      latestCompetitive: [],
      latestPractice: [],
    }
  );
};
