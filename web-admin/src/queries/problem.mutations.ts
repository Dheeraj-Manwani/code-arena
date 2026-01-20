import { useMutation } from "@tanstack/react-query";
import { problemApi } from "@/api/problem";
import type { AddMcqType, AddDsaType, UpdateMcqType, UpdateDsaType } from "@/schema/contest.schema";
import { queryClient } from "@/lib/queryClient";

export const useCreateMcqQuestionMutation = () => {
  return useMutation({
    mutationFn: (data: AddMcqType) => problemApi.createMcqQuestion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["mcqQuestions"],
      });
      queryClient.invalidateQueries({
        queryKey: ["stats"],
      });
    },
  });
};

export const useCreateDsaProblemMutation = () => {
  return useMutation({
    mutationFn: (data: AddDsaType) => problemApi.createDsaProblem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["dsaProblems"],
      });
      queryClient.invalidateQueries({
        queryKey: ["stats"],
      });
    },
  });
};

export const useUpdateMcqQuestionMutation = () => {
  return useMutation({
    mutationFn: ({ questionId, data }: { questionId: number; data: UpdateMcqType }) =>
      problemApi.updateMcqQuestion(questionId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["mcqQuestions"],
      });
      queryClient.invalidateQueries({
        queryKey: ["mcqQuestion", variables.questionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["stats"],
      });
    },
  });
};

export const useUpdateDsaProblemMutation = () => {
  return useMutation({
    mutationFn: ({ problemId, data }: { problemId: number; data: UpdateDsaType }) =>
      problemApi.updateDsaProblem(problemId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["dsaProblems"],
      });
      queryClient.invalidateQueries({
        queryKey: ["dsaProblem", variables.problemId],
      });
      queryClient.invalidateQueries({
        queryKey: ["stats"],
      });
    },
  });
};
