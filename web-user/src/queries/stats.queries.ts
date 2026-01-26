// import { useQuery } from "@tanstack/react-query";
// import { statsApi, type UserStats } from "@/api/stats";

// export const useUserStatsQuery = () => {
//   return useQuery({
//     queryKey: ["userStats"],
//     queryFn: async (): Promise<UserStats> => {
//       const { data } = await statsApi.getUserStats();
//       return data;
//     },
//     retry: false,
//     staleTime: 60000, // Cache for 1 minute
//     refetchOnWindowFocus: false,
//   });
// };
