import api from "@/lib/axios";
import type {
  ContestResponse,
  CreateContestInput,
  UpdateContestInput,
} from "@/schema/contest.schema";

export const contestApi = {
  getAllContests: async (
    page: number, 
    limit: number, 
    search?: string,
    status?: string,
    sortBy?: string
  ): Promise<ContestResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search && search.trim()) {
      params.append("search", search.trim());
    }
    if (status && status !== "all") {
      params.append("status", status);
    }
    if (sortBy) {
      params.append("sortBy", sortBy);
    }
    const res = await api.get(`/api/contests?${params.toString()}`);
    return res.data;
  },

  createContest: async (data: CreateContestInput) => {
    const res = await api.post("/api/contests", data);
    return res.data;
  },

  getContestById: async (contestId: number, includeQuestions: boolean = false) => {
    const params = includeQuestions ? "?includeQuestions=true" : "";
    const res = await api.get(`/api/contests/${contestId}${params}`);
    return res.data;
  },

  updateContest: async (contestId: number, data: UpdateContestInput) => {
    const res = await api.patch(`/api/contests/${contestId}`, data);
    return res.data;
  },

  addMcq: async (contestId: number, data: any) => {
    const res = await api.post(`/api/contests/${contestId}/mcq`, data);
    return res.data;
  },

  addDsa: async (contestId: number, data: any) => {
    const res = await api.post(`/api/contests/${contestId}/dsa`, data);
    return res.data;
  },

  linkMcq: async (contestId: number, questionId: number, order: number) => {
    const res = await api.post(`/api/contests/${contestId}/link/mcq`, {
      questionId,
      order,
    });
    return res.data;
  },

  linkDsa: async (contestId: number, problemId: number, order: number) => {
    const res = await api.post(`/api/contests/${contestId}/link/dsa`, {
      problemId,
      order,
    });
    return res.data;
  },

  unlinkMcq: async (contestId: number, questionId: number) => {
    const res = await api.delete(`/api/contests/${contestId}/link/mcq/${questionId}`);
    return res.data;
  },

  unlinkDsa: async (contestId: number, problemId: number) => {
    const res = await api.delete(`/api/contests/${contestId}/link/dsa/${problemId}`);
    return res.data;
  },

  reorderQuestions: async (contestId: number, questionOrders: Array<{ id: number; isMcq: boolean; order: number }>) => {
    const res = await api.patch(`/api/contests/${contestId}/reorder`, {
      questionOrders,
    });
    return res.data;
  },
};
