import api from "@/lib/axios";
import type { SubmitMcqSchemaType, SubmitDsaSchemaType } from "@/schema/submission.schema";

export const submissionApi = {
  saveMcqDraft: async (
    contestId: number,
    attemptId: number,
    questionId: number,
    data: SubmitMcqSchemaType
  ) => {
    const res = await api.put(
      `/api/contests/${contestId}/attempt/${attemptId}/draft/mcq/${questionId}`,
      data
    );
    return res.data;
  },

  saveDsaDraft: async (
    contestId: number,
    attemptId: number,
    problemId: number,
    data: SubmitDsaSchemaType
  ) => {
    const res = await api.put(
      `/api/contests/${contestId}/attempt/${attemptId}/draft/dsa/${problemId}`,
      data
    );
    return res.data;
  },

  submitMcq: async (
    contestId: number,
    attemptId: number,
    questionId: number,
    data: SubmitMcqSchemaType
  ) => {
    const res = await api.post(
      `/api/contests/${contestId}/attempt/${attemptId}/mcq/${questionId}/submit`,
      data
    );
    return res.data;
  },

  submitDsa: async (
    contestId: number,
    attemptId: number,
    problemId: number,
    data: SubmitDsaSchemaType
  ) => {
    const res = await api.post(
      `/api/contests/${contestId}/attempt/${attemptId}/dsa/${problemId}/submit`,
      data
    );
    return res.data;
  },

  submitContest: async (contestId: number, attemptId: number) => {
    const res = await api.post(
      `/api/contests/${contestId}/attempt/${attemptId}/submit`
    );
    return res.data;
  },
};
