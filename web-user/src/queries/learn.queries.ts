import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { learnApi, learnMutations, learnMomentum, learnWorkbook } from "@/api/learn";

export const learnKeys = {
  gallery: ["learnGallery"] as const,
  path: (slug: string) => ["learnPath", slug] as const,
  lesson: (lessonId: number) => ["learnLesson", lessonId] as const,
};

export const useLearnGalleryQuery = () =>
  useQuery({
    queryKey: learnKeys.gallery,
    queryFn: learnApi.getGallery,
  });

export const useLearnPathQuery = (slug: string | undefined) =>
  useQuery({
    queryKey: learnKeys.path(slug ?? ""),
    queryFn: () => learnApi.getPath(slug!),
    enabled: Boolean(slug),
  });

export const useLearnLessonQuery = (lessonId: number | undefined) =>
  useQuery({
    queryKey: learnKeys.lesson(lessonId ?? 0),
    queryFn: () => learnApi.getLesson(lessonId!),
    enabled: Number.isFinite(lessonId),
  });

/**
 * Progress mutations.
 *
 * Every one invalidates the whole path plus the gallery: completing a question
 * cascades counts up three container levels and can flip a module's gate, so a
 * targeted update would be wrong more often than it would be fast.
 */
const useLearnMutation = <T>(
  fn: (arg: T) => Promise<void>,
  pathSlug: string | undefined,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      if (pathSlug) queryClient.invalidateQueries({ queryKey: learnKeys.path(pathSlug) });
      queryClient.invalidateQueries({ queryKey: learnKeys.gallery });
      queryClient.invalidateQueries({ queryKey: ["learnLesson"] });
    },
  });
};

export const useSelfMarkMutation = (pathSlug: string | undefined) =>
  useLearnMutation(learnMutations.selfMark, pathSlug);

export const useUnmarkMutation = (pathSlug: string | undefined) =>
  useLearnMutation(learnMutations.unmark, pathSlug);

export const useUnlockModuleMutation = (pathSlug: string | undefined) =>
  useLearnMutation(learnMutations.unlockModule, pathSlug);

export const useResetPathMutation = (pathSlug: string | undefined) =>
  useLearnMutation(learnMutations.resetPath, pathSlug);

/**
 * Downloading the progress sheet.
 *
 * A mutation rather than a query even though it only reads: it must run when
 * the user clicks, never on mount or a refetch, and it has no cacheable result —
 * exactly the shape `useMutation` is for.
 */
export const useExportPathMutation = (pathSlug: string | undefined) =>
  useMutation({
    mutationFn: async () => {
      if (!pathSlug) throw new Error("Path slug is required");
      const { blob, filename } = await learnWorkbook.exportPath(pathSlug);

      // Object URL + synthetic click. The endpoint is authenticated, so a plain
      // `<a href>` would navigate without the Authorization header and get a
      // 401; the file has to come back through the configured axios client.
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Revoking synchronously can cancel the download in some browsers before
      // it starts reading; a tick's grace avoids that without leaking.
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  });

/**
 * Uploading an edited sheet.
 *
 * Invalidates the same three keys as every other progress write — an import can
 * change hundreds of questions at once, so anything less than a full refetch
 * would leave counts stale across the page.
 */
export const useImportPathMutation = (pathSlug: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => {
      if (!pathSlug) throw new Error("Path slug is required");
      return learnWorkbook.importPath(pathSlug, file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: learnKeys.path(pathSlug ?? "") });
      queryClient.invalidateQueries({ queryKey: learnKeys.gallery });
      queryClient.invalidateQueries({ queryKey: ["learnLesson"] });
    },
  });
};

/**
 * Answering an MCQ.
 *
 * Not routed through `useLearnMutation` because it returns a body the caller
 * needs (correctness), and because invalidating on *every* attempt would refetch
 * the whole path after each wrong guess. Only a correct answer changes progress.
 */
export const useAnswerMcqMutation = (pathSlug: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      questionId,
      selectedOptionIndex,
    }: {
      questionId: number;
      selectedOptionIndex: number;
    }) => learnMutations.answerMcq(questionId, selectedOptionIndex),
    onSuccess: (data) => {
      if (!data.isCorrect) return;
      if (pathSlug) queryClient.invalidateQueries({ queryKey: learnKeys.path(pathSlug) });
      queryClient.invalidateQueries({ queryKey: learnKeys.gallery });
      queryClient.invalidateQueries({ queryKey: ["learnLesson"] });
    },
  });
};

export const useCelebrationsQuery = (pathSlug: string | undefined) =>
  useQuery({
    queryKey: ["learnCelebrations", pathSlug],
    queryFn: () => learnMomentum.getCelebrations(pathSlug!),
    enabled: Boolean(pathSlug),
  });

/**
 * What to do after solving, fetched only when the solve page carries path
 * context. Kept fresh rather than cached: the answer changes the moment the
 * verdict lands, and a stale "next" would point at the question just finished.
 */
export const useNextQuestionQuery = (
  pathSlug: string | undefined,
  questionId: number | undefined,
) =>
  useQuery({
    queryKey: ["learnNext", pathSlug, questionId],
    queryFn: () => learnMomentum.getNextQuestion(pathSlug!, questionId!),
    enabled: Boolean(pathSlug) && Number.isFinite(questionId),
    staleTime: 0,
  });

/**
 * Acknowledge a milestone.
 *
 * §5.5: the client marks it seen *before* the animation finishes, not after —
 * someone who closes the tab mid-confetti has still seen it, and a duplicate is
 * worse than a miss.
 */
export const useAcknowledgeCelebrationMutation = (pathSlug: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { moduleId?: number; lessonIds?: number[] }) => {
      if (input.moduleId !== undefined) {
        await learnMomentum.acknowledgeModule(input.moduleId);
      }
      for (const lessonId of input.lessonIds ?? []) {
        await learnMomentum.acknowledgeLesson(lessonId);
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["learnCelebrations", pathSlug] }),
  });
};
