export type UserStats = {
  active: number;
  upcoming: number;
  past: number;
};

export type UserStatsResponse = {
  success: boolean;
  data: UserStats;
};

// export const statsApi = {
//   getUserStats: async (): Promise<UserStatsResponse> => {
//     const res = await api.get<UserStatsResponse>("/api/stats/user");
//     return res.data;
//   },
// };
