import { useQuery } from "@tanstack/react-query";
import { statsApi } from "@/api/stats";

export const useStatsQuery = () => {
    return useQuery({
        queryKey: ["stats"],
        queryFn: async () => {
            try {
                const data = await statsApi.getStats();
                return data.data;
            } catch {
                throw new Error("Failed to fetch stats");
            }
        },
        retry: false,
        staleTime: 1_000 * 60 * 1,
    });
};
