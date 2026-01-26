import api from "@/lib/axios";
import type { SubmitMcqSchemaType, SubmitDsaSchemaType } from "@/schema/submission.schema";

export const submissionApi = {
  submitMcq: async (
    contestId: number,
    questionId: number,
    data: SubmitMcqSchemaType
  ) => {
    const res = await api.post(
      `/api/contests/${contestId}/mcq/${questionId}/submit`,
      data
    );
    return res.data;
  },

  submitDsa: async (
    problemId: number,
    data: SubmitDsaSchemaType
  ) => {
    const res = await api.post(
      `/api/problems/${problemId}/submit`,
      data
    );
    return res.data;
  },
};
