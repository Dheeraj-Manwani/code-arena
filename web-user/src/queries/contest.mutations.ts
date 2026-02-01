import { contestApi } from "@/api/contest"
import { useMutation } from "@tanstack/react-query"

export const useContestAttempt = () => {
    return useMutation({
        mutationFn: async (contestId: number): Promise<{ success: boolean, data: { attemptId: number } }> => {
            const data = await contestApi.requestAttempt(contestId);
            return data;
        }
    })
}