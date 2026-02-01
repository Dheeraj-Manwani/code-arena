import { useMutation } from "@tanstack/react-query";
import { submissionApi } from "@/api/submission";
import type { SubmitMcqSchemaType, SubmitDsaSchemaType } from "@/schema/submission.schema";
import { queryClient } from "@/lib/queryClient";
import toast from "react-hot-toast";

export const useSaveMcqDraftMutation = () => {
  return useMutation({
    mutationFn: ({
      contestId,
      attemptId,
      questionId,
      data,
    }: {
      contestId: number;
      attemptId: number;
      questionId: number;
      data: SubmitMcqSchemaType;
    }) => submissionApi.saveMcqDraft(contestId, attemptId, questionId, data),
    onSuccess: (_, variables) => {
      toast.success("Draft saved successfully");
      queryClient.invalidateQueries({
        queryKey: ["contest-attempt", variables.contestId, variables.attemptId],
      });
    },
  });
};

export const useSaveDsaDraftMutation = () => {
  return useMutation({
    mutationFn: ({
      contestId,
      attemptId,
      problemId,
      data,
    }: {
      contestId: number;
      attemptId: number;
      problemId: number;
      data: SubmitDsaSchemaType;
    }) => submissionApi.saveDsaDraft(contestId, attemptId, problemId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["contest-attempt", variables.contestId, variables.attemptId],
      });
    },
  });
};

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
