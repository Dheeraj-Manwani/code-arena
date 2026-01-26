import { useMutation } from "@tanstack/react-query";
import { submissionApi } from "@/api/submission";
import type { SubmitMcqSchemaType, SubmitDsaSchemaType } from "@/schema/submission.schema";
import { queryClient } from "@/lib/queryClient";

export const useSubmitMcqMutation = () => {
  return useMutation({
    mutationFn: ({
      contestId,
      questionId,
      data,
    }: {
      contestId: number;
      questionId: number;
      data: SubmitMcqSchemaType;
    }) => submissionApi.submitMcq(contestId, questionId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["contest", variables.contestId],
      });
      queryClient.invalidateQueries({
        queryKey: ["leaderboard", variables.contestId],
      });
    },
  });
};

export const useSubmitDsaMutation = () => {
  return useMutation({
    mutationFn: ({
      problemId,
      data,
    }: {
      problemId: number;
      data: SubmitDsaSchemaType;
    }) => submissionApi.submitDsa(problemId, data),
    onSuccess: () => {
      // Invalidate relevant queries - we may need contestId here
      queryClient.invalidateQueries({
        queryKey: ["leaderboard"],
      });
    },
  });
};
