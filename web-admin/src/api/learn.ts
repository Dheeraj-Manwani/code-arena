import api from "@/lib/axios";
import type {
  LearnPathSummary,
  LearnPathTree,
  LearnPathValidation,
  LearnPathImpact,
  LearnPathStatus,
  ProblemUsage,
  CreateLearnPathInput,
} from "@/schema/learn.schema";

const BASE = "/api/admin/learn";

export const learnApi = {
  listPaths: async (): Promise<LearnPathSummary[]> =>
    (await api.get(`${BASE}/paths`)).data.data,

  getPath: async (pathId: number): Promise<LearnPathTree> =>
    (await api.get(`${BASE}/paths/${pathId}`)).data.data,

  createPath: async (input: CreateLearnPathInput): Promise<LearnPathSummary> =>
    (await api.post(`${BASE}/paths`, input)).data.data,

  updatePath: async (
    pathId: number,
    input: Partial<{
      title: string;
      description: string;
      status: LearnPathStatus;
      unlockThreshold: number;
      isFeatured: boolean;
    }>,
  ): Promise<LearnPathSummary> =>
    (await api.patch(`${BASE}/paths/${pathId}`, input)).data.data,

  archivePath: async (pathId: number): Promise<LearnPathSummary> =>
    (await api.delete(`${BASE}/paths/${pathId}`)).data.data,

  validatePath: async (pathId: number): Promise<LearnPathValidation> =>
    (await api.get(`${BASE}/paths/${pathId}/validate`)).data.data,

  getImpact: async (pathId: number): Promise<LearnPathImpact> =>
    (await api.get(`${BASE}/paths/${pathId}/impact`)).data.data,

  createModule: async (pathId: number, input: { slug: string; title: string; summary?: string | null }) =>
    (await api.post(`${BASE}/paths/${pathId}/modules`, input)).data.data,

  updateModule: async (moduleId: number, input: { title?: string; summary?: string | null }) =>
    (await api.patch(`${BASE}/modules/${moduleId}`, input)).data.data,

  deleteModule: async (moduleId: number) =>
    (await api.delete(`${BASE}/modules/${moduleId}`)).data.data,

  reorderModule: async (moduleId: number, targetIndex: number) =>
    (await api.patch(`${BASE}/modules/${moduleId}/order`, { targetIndex })).data.data,

  createLesson: async (moduleId: number, input: { slug: string; title: string; body?: string | null }) =>
    (await api.post(`${BASE}/modules/${moduleId}/lessons`, input)).data.data,

  updateLesson: async (lessonId: number, input: { title?: string; body?: string | null }) =>
    (await api.patch(`${BASE}/lessons/${lessonId}`, input)).data.data,

  deleteLesson: async (lessonId: number) =>
    (await api.delete(`${BASE}/lessons/${lessonId}`)).data.data,

  reorderLesson: async (lessonId: number, targetIndex: number) =>
    (await api.patch(`${BASE}/lessons/${lessonId}/order`, { targetIndex })).data.data,

  attachQuestion: async (
    lessonId: number,
    input:
      | { kind: "problem"; problemId: number; note?: string | null }
      | { kind: "mcq"; mcqId: number; note?: string | null },
  ) => (await api.post(`${BASE}/lessons/${lessonId}/questions`, input)).data.data,

  detachQuestion: async (questionId: number) =>
    (await api.delete(`${BASE}/questions/${questionId}`)).data.data,

  reorderQuestion: async (questionId: number, targetIndex: number) =>
    (await api.patch(`${BASE}/questions/${questionId}/order`, { targetIndex })).data.data,

  getProblemUsage: async (problemId: number): Promise<ProblemUsage> =>
    (await api.get(`${BASE}/problems/${problemId}/usage`)).data.data,
};
