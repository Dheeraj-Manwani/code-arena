import api from "@/lib/axios";
import type {
  AttemptListResponse,
  AttemptResultResponse,
} from "@/schema/attempt.schema";

export const attemptsApi = {
  list: async (page: number, limit: number): Promise<AttemptListResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    const res = await api.get<{ success: boolean; data: AttemptListResponse }>(
      `/api/attempts?${params.toString()}`,
    );
    return res.data.data;
  },

  results: async (attemptId: number): Promise<AttemptResultResponse> => {
    const res = await api.get<{ success: boolean; data: AttemptResultResponse }>(
      `/api/attempts/${attemptId}/results`,
    );
    return res.data.data;
  },
};
