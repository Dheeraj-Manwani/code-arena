import { useMutation, useQuery } from "@tanstack/react-query";
import { learnApi } from "@/api/learn";
import { queryClient } from "@/lib/queryClient";
import type { CreateLearnPathInput, LearnPathStatus } from "@/schema/learn.schema";

export const learnKeys = {
  paths: ["learnPaths"] as const,
  path: (pathId: number) => ["learnPath", pathId] as const,
  validation: (pathId: number) => ["learnPathValidation", pathId] as const,
  impact: (pathId: number) => ["learnPathImpact", pathId] as const,
  problemUsage: (problemId: number) => ["learnProblemUsage", problemId] as const,
};

export const useLearnPathsQuery = () =>
  useQuery({
    queryKey: learnKeys.paths,
    queryFn: learnApi.listPaths,
    retry: false,
  });

export const useLearnPathQuery = (pathId: number, enabled = true) =>
  useQuery({
    queryKey: learnKeys.path(pathId),
    queryFn: () => learnApi.getPath(pathId),
    enabled: enabled && Number.isFinite(pathId),
    retry: false,
  });

export const useLearnPathValidationQuery = (pathId: number, enabled = true) =>
  useQuery({
    queryKey: learnKeys.validation(pathId),
    queryFn: () => learnApi.validatePath(pathId),
    enabled: enabled && Number.isFinite(pathId),
    retry: false,
  });

export const useLearnPathImpactQuery = (pathId: number, enabled = true) =>
  useQuery({
    queryKey: learnKeys.impact(pathId),
    queryFn: () => learnApi.getImpact(pathId),
    enabled: enabled && Number.isFinite(pathId),
    retry: false,
  });

/**
 * Every structural edit invalidates the whole tree plus its validation.
 *
 * Deliberately coarse: totals cascade upward (§5.10) and publish-readiness can
 * change from any edit anywhere in the path, so a targeted invalidation would
 * be wrong more often than it would be fast. One path is a small payload.
 */
const invalidateTree = (pathId: number) => {
  queryClient.invalidateQueries({ queryKey: learnKeys.path(pathId) });
  queryClient.invalidateQueries({ queryKey: learnKeys.validation(pathId) });
  queryClient.invalidateQueries({ queryKey: learnKeys.paths });
};

export const useCreateLearnPathMutation = () =>
  useMutation({
    mutationFn: (input: CreateLearnPathInput) => learnApi.createPath(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: learnKeys.paths }),
  });

export const useUpdateLearnPathMutation = (pathId: number) =>
  useMutation({
    mutationFn: (input: Parameters<typeof learnApi.updatePath>[1]) =>
      learnApi.updatePath(pathId, input),
    onSuccess: () => invalidateTree(pathId),
  });

export const useArchiveLearnPathMutation = () =>
  useMutation({
    mutationFn: (pathId: number) => learnApi.archivePath(pathId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: learnKeys.paths }),
  });

export const useLearnStructureMutations = (pathId: number) => {
  const onSuccess = () => invalidateTree(pathId);

  return {
    createModule: useMutation({
      mutationFn: (input: { slug: string; title: string; summary?: string | null }) =>
        learnApi.createModule(pathId, input),
      onSuccess,
    }),
    updateModule: useMutation({
      mutationFn: ({ moduleId, ...input }: { moduleId: number; title?: string; summary?: string | null }) =>
        learnApi.updateModule(moduleId, input),
      onSuccess,
    }),
    deleteModule: useMutation({
      mutationFn: (moduleId: number) => learnApi.deleteModule(moduleId),
      onSuccess,
    }),
    reorderModule: useMutation({
      mutationFn: ({ moduleId, targetIndex }: { moduleId: number; targetIndex: number }) =>
        learnApi.reorderModule(moduleId, targetIndex),
      onSuccess,
    }),
    createLesson: useMutation({
      mutationFn: ({ moduleId, ...input }: { moduleId: number; slug: string; title: string; body?: string | null }) =>
        learnApi.createLesson(moduleId, input),
      onSuccess,
    }),
    updateLesson: useMutation({
      mutationFn: ({ lessonId, ...input }: { lessonId: number; title?: string; body?: string | null }) =>
        learnApi.updateLesson(lessonId, input),
      onSuccess,
    }),
    deleteLesson: useMutation({
      mutationFn: (lessonId: number) => learnApi.deleteLesson(lessonId),
      onSuccess,
    }),
    reorderLesson: useMutation({
      mutationFn: ({ lessonId, targetIndex }: { lessonId: number; targetIndex: number }) =>
        learnApi.reorderLesson(lessonId, targetIndex),
      onSuccess,
    }),
    attachQuestion: useMutation({
      mutationFn: ({
        lessonId,
        ...input
      }:
        | { lessonId: number; kind: "problem"; problemId: number }
        | { lessonId: number; kind: "mcq"; mcqId: number }) =>
        learnApi.attachQuestion(lessonId, input),
      onSuccess,
    }),
    detachQuestion: useMutation({
      mutationFn: (questionId: number) => learnApi.detachQuestion(questionId),
      onSuccess,
    }),
    reorderQuestion: useMutation({
      mutationFn: ({ questionId, targetIndex }: { questionId: number; targetIndex: number }) =>
        learnApi.reorderQuestion(questionId, targetIndex),
      onSuccess,
    }),
  };
};

export const setPathStatus = (pathId: number, status: LearnPathStatus) =>
  learnApi.updatePath(pathId, { status });
