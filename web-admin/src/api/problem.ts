import api from "@/lib/axios";
import type {
  McqQuestionsResponse,
  DsaProblemsResponse,
  McqQuestion,
  DsaProblem,
} from "@/schema/problem.schema";
import type { AddMcqType, AddDsaType, UpdateMcqType, UpdateDsaType } from "@/schema/contest.schema";

export const problemApi = {
  getAllMcqQuestions: async (
    page: number,
    limit: number,
    search?: string
  ): Promise<{ data: McqQuestionsResponse }> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search && search.trim()) {
      params.append("search", search.trim());
    }
    const res = await api.get(`/api/problems/mcq?${params.toString()}`);
    return res.data;
  },

  getAllDsaProblems: async (
    page: number,
    limit: number,
    search?: string
  ): Promise<{ data: DsaProblemsResponse }> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search && search.trim()) {
      params.append("search", search.trim());
    }
    const res = await api.get(`/api/problems/dsa?${params.toString()}`);
    return res.data;
  },

  getMcqQuestionById: async (questionId: number): Promise<{ data: McqQuestion }> => {
    const res = await api.get(`/api/problems/mcq/${questionId}`);
    return res.data;
  },

  getDsaProblemById: async (problemId: number): Promise<{ data: DsaProblem }> => {
    const res = await api.get(`/api/problems/dsa/${problemId}`);
    return res.data;
  },

  createMcqQuestion: async (data: AddMcqType) => {
    const res = await api.post("/api/problems/mcq", data);
    return res.data;
  },

  createDsaProblem: async (data: AddDsaType) => {
    const res = await api.post("/api/problems/dsa", data);
    return res.data;
  },

  updateMcqQuestion: async (questionId: number, data: UpdateMcqType) => {
    const res = await api.patch(`/api/problems/mcq/${questionId}`, data);
    return res.data;
  },

  updateDsaProblem: async (problemId: number, data: UpdateDsaType) => {
    const res = await api.patch(`/api/problems/dsa/${problemId}`, data);
    return res.data;
  },
};
