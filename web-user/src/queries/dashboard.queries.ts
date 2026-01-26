import { useQuery } from "@tanstack/react-query";
import { getDashboardFeed } from "@/api/dashboard";

export const useDashboardFeedQuery = () => {
  return useQuery({
    queryKey: ["dashboard-feed"],
    queryFn: getDashboardFeed,
    retry: false,
    staleTime: 0,
  });
};
