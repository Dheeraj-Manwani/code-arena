import { useQuery } from "@tanstack/react-query";
import { contestApi } from "@/api/contest";

export const useContestsQuery = (
    page: number, 
    limit: number,
    search?: string,
    status?: string,
    sortBy?: string
) => {
    return useQuery({
        queryKey: ["contests", page, limit, search, status, sortBy],
        queryFn: async () => {
            try {
                const data = await contestApi.getAllContests(page, limit, search, status, sortBy);
                return data.data;
            } catch {
                throw new Error("Failed to fetch contests");
            }
        },
        retry: false,
        staleTime: 0,
    });
};

export const useContestQuery = (contestId: number | undefined, includeQuestions: boolean = false) => {
    return useQuery({
        queryKey: ["contest", contestId, includeQuestions],
        queryFn: async () => {
            if (!contestId) {
                throw new Error("Contest ID is required");
            }
            try {
                const data = await contestApi.getContestById(contestId, includeQuestions);
                return data.data;
            } catch {
                throw new Error("Failed to fetch contest");
            }
        },
        enabled: !!contestId,
        retry: false,
        staleTime: 0, // Always refetch for detail page
    });
};