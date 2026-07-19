import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { practiceApi } from "@/api/practice";
import type {
  CatalogueResponse,
  PracticeDraft,
  PracticeProblem,
  PracticeSubmission,
  ProblemFilters,
} from "@/schema/practice.schema";

export const useProblemsQuery = (filters: ProblemFilters) => {
  return useQuery({
    queryKey: ["problems", filters],
    queryFn: async (): Promise<CatalogueResponse> => {
      const { data } = await practiceApi.getProblems(filters);
      return data;
    },
    // Keep the current page on screen while the next one loads, so paging and
    // filtering don't flash the whole list back to skeletons.
    placeholderData: keepPreviousData,
    retry: false,
  });
};

export const useProblemTagsQuery = () => {
  return useQuery({
    queryKey: ["problem-tags"],
    queryFn: async (): Promise<string[]> => {
      const { data } = await practiceApi.getTags();
      return data;
    },
    // The tag set barely moves; no need to refetch it on every filter change.
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
};

export const useProblemQuery = (slug: string | undefined) => {
  return useQuery({
    queryKey: ["problem", slug],
    queryFn: async (): Promise<PracticeProblem> => {
      if (!slug) throw new Error("Problem slug is required");
      const { data } = await practiceApi.getProblemBySlug(slug);
      return data;
    },
    enabled: Boolean(slug),
    retry: false,
  });
};

export const practiceSubmissionsKey = (slug: string | undefined) => [
  "practice-submissions",
  slug,
];

export const usePracticeSubmissionsQuery = (slug: string | undefined) => {
  return useQuery({
    queryKey: practiceSubmissionsKey(slug),
    queryFn: async (): Promise<PracticeSubmission[]> => {
      if (!slug) throw new Error("Problem slug is required");
      const { data } = await practiceApi.getSubmissions(slug);
      return data;
    },
    enabled: Boolean(slug),
    retry: false,
  });
};

/** Server-side draft. Only read on mount — the editor owns the code after that. */
export const usePracticeDraftQuery = (slug: string | undefined) => {
  return useQuery({
    queryKey: ["practice-draft", slug],
    queryFn: async (): Promise<PracticeDraft | null> => {
      if (!slug) throw new Error("Problem slug is required");
      const { data } = await practiceApi.getDraft(slug);
      return data;
    },
    enabled: Boolean(slug),
    retry: false,
    // A draft the user is actively editing must not be re-fetched over their
    // in-progress code.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
};

export const useSavePracticeDraftMutation = (slug: string | undefined) => {
  return useMutation({
    mutationFn: (body: { code: string; language: string }) => {
      if (!slug) throw new Error("Problem slug is required");
      return practiceApi.saveDraft(slug, body);
    },
  });
};

export const useSubmitPracticeMutation = (slug: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { code: string; language: string }) => {
      if (!slug) throw new Error("Problem slug is required");
      return practiceApi.submitSolution(slug, body);
    },
    onSuccess: () => {
      // The new row lands as `pending`; the verdict arrives over the WS user room.
      void queryClient.invalidateQueries({ queryKey: practiceSubmissionsKey(slug) });
    },
  });
};
