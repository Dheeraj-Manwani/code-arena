import api from "@/lib/axios";
import type {
  Contest,
  ContestResponse,
  ContestType,
} from "@/schema/contest.schema";
import type { ContestAttempt } from "@/schema/submission.schema";

export const contestApi = {
  getAllContests: async (
    page: number,
    limit: number,
    search?: string,
    status?: string,
    type?: ContestType,
    sortBy?: string,
  ): Promise<ContestResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search?.trim()) params.append("search", search.trim());
    if (status && status !== "all") params.append("status", status);
    if (type && (type === "practice" || type === "competitive"))
      params.append("type", type);
    if (sortBy) params.append("sortBy", sortBy);
    const res = await api.get<ContestResponse>(
      `/api/contests?${params.toString()}`,
    );
    return res.data;
  },

  getContestById: async (
    contestId: number,
    includeQuestions = false,
  ): Promise<{ success: boolean; data: Contest }> => {
    const params = includeQuestions ? "?includeQuestions=true" : "";
    const res = await api.get<{ success: boolean; data: Contest }>(
      `/api/contests/${contestId}${params}`,
    );
    return res.data;
  },

  requestAttempt: async (contestId: number): Promise<{ success: boolean, data: { attemptId: number } }> => {
    const res = await api.post(`/api/contests/${contestId}/attempt`);
    return res.data;
  },

  getContestAttemptById: async (
    contestId: number,
    attemptId: number,
  ): Promise<{ success: boolean; data: ContestAttempt }> => {
    const res = await api.get<{ success: boolean; data: ContestAttempt }>(
      `/api/contests/${contestId}/attempt/${attemptId}`,
    );
    return res.data;
  },
};
