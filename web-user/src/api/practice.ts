import api from "@/lib/axios";
import type {
  CatalogueResponse,
  PracticeDraft,
  PracticeProblem,
  PracticeSubmission,
  PracticeSubmitResult,
  ProblemFilters,
} from "@/schema/practice.schema";

export const practiceApi = {
  getProblems: async (
    filters: ProblemFilters,
  ): Promise<{ success: boolean; data: CatalogueResponse }> => {
    const params = new URLSearchParams({
      page: String(filters.page),
      limit: String(filters.limit),
      sortBy: filters.sortBy,
    });

    if (filters.search?.trim()) params.append("search", filters.search.trim());
    if (filters.difficulty) params.append("difficulty", filters.difficulty);
    if (filters.status) params.append("status", filters.status);
    // Repeated `tags` params — the API also accepts a comma-separated value, but
    // repeating avoids escaping questions for tags that contain a comma.
    for (const tag of filters.tags ?? []) params.append("tags", tag);

    const res = await api.get(`/api/problems?${params.toString()}`);
    return res.data;
  },

  getTags: async (): Promise<{ success: boolean; data: string[] }> => {
    const res = await api.get("/api/problems/tags");
    return res.data;
  },

  getProblemBySlug: async (
    slug: string,
  ): Promise<{ success: boolean; data: PracticeProblem }> => {
    const res = await api.get(`/api/problems/${encodeURIComponent(slug)}`);
    return res.data;
  },

  submitSolution: async (
    slug: string,
    body: { code: string; language: string },
  ): Promise<{ success: boolean; data: PracticeSubmitResult }> => {
    const res = await api.post(
      `/api/practice/problems/${encodeURIComponent(slug)}/submit`,
      body,
    );
    return res.data;
  },

  getSubmissions: async (
    slug: string,
  ): Promise<{ success: boolean; data: PracticeSubmission[] }> => {
    const res = await api.get(
      `/api/practice/problems/${encodeURIComponent(slug)}/submissions`,
    );
    return res.data;
  },

  getDraft: async (
    slug: string,
  ): Promise<{ success: boolean; data: PracticeDraft | null }> => {
    const res = await api.get(
      `/api/practice/problems/${encodeURIComponent(slug)}/draft`,
    );
    return res.data;
  },

  saveDraft: async (
    slug: string,
    body: { code: string; language: string },
  ): Promise<{ success: boolean }> => {
    const res = await api.put(
      `/api/practice/problems/${encodeURIComponent(slug)}/draft`,
      body,
    );
    return res.data;
  },
};
