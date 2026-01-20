import { useQuery } from "@tanstack/react-query";
import { problemApi } from "@/api/problem";

export const useMcqQuestionsQuery = (page: number, limit: number, search?: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ["mcqQuestions", page, limit, search],
    queryFn: async () => {
      try {
        const data = await problemApi.getAllMcqQuestions(page, limit, search);
        return data.data;
      } catch {
        throw new Error("Failed to fetch MCQ questions");
      }
    },
    enabled,
    retry: false,
    staleTime: 0,
  });
};

export const useDsaProblemsQuery = (page: number, limit: number, search?: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ["dsaProblems", page, limit, search],
    queryFn: async () => {
      try {
        const data = await problemApi.getAllDsaProblems(page, limit, search);
        return data.data;
      } catch {
        throw new Error("Failed to fetch DSA problems");
      }
    },
    enabled,
    retry: false,
    staleTime: 0,
  });
};
