import { useMutation } from "@tanstack/react-query";
import { contestApi } from "@/api/contest";
import type {
  CreateContestInput,
  UpdateContestInput,
} from "@/schema/contest.schema";
import { queryClient } from "@/lib/queryClient";

export const useCreateContestMutation = () => {
  return useMutation({
    mutationFn: (data: CreateContestInput) => contestApi.createContest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contests"],
      });
      queryClient.invalidateQueries({
        queryKey: ["stats"],
      });
    },
  });
};

export const useUpdateContestMutation = () => {
  return useMutation({
    mutationFn: ({
      contestId,
      data,
    }: {
      contestId: number;
      data: UpdateContestInput;
    }) => contestApi.updateContest(contestId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["contest", variables.contestId],
      });
      queryClient.invalidateQueries({
        queryKey: ["contests"],
      });
      queryClient.invalidateQueries({
        queryKey: ["stats"],
      });
    },
  });
};
