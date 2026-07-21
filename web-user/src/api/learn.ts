import api from "@/lib/axios";
import type {
  LearnPathCard,
  LearnPathDetail,
  LearnLessonDetail,
} from "@/schema/learn.schema";

export const learnApi = {
  getGallery: async (): Promise<LearnPathCard[]> =>
    (await api.get("/api/learn/paths")).data.data,

  getPath: async (slug: string): Promise<LearnPathDetail> =>
    (await api.get(`/api/learn/paths/${slug}`)).data.data,

  getLesson: async (lessonId: number): Promise<LearnLessonDetail> =>
    (await api.get(`/api/learn/lessons/${lessonId}`)).data.data,
};

/** Phase 4 writes. All user-scoped — the server derives the user from the token. */
export const learnMutations = {
  selfMark: async (questionId: number): Promise<void> => {
    await api.put(`/api/learn/questions/${questionId}/complete`);
  },

  unmark: async (questionId: number): Promise<void> => {
    await api.delete(`/api/learn/questions/${questionId}/complete`);
  },

  unlockModule: async (moduleId: number): Promise<void> => {
    await api.post(`/api/learn/modules/${moduleId}/unlock`);
  },

  answerMcq: async (
    questionId: number,
    selectedOptionIndex: number,
  ): Promise<{ isCorrect: boolean; correctOptionIndex: number | null; attempts: number }> =>
    (await api.post(`/api/learn/questions/${questionId}/answer`, { selectedOptionIndex })).data
      .data,

  resetPath: async (slug: string): Promise<void> => {
    await api.post(`/api/learn/paths/${slug}/reset`);
  },
};

/** What the server did with an uploaded sheet. Mirrors `ImportSummary` in api-http. */
export interface ImportSummary {
  completed: number;
  cleared: number;
  unchanged: number;
  /** Verified completions the sheet tried to un-tick. Refused by design. */
  skippedVerified: number;
  /** MCQs the sheet tried to tick. Refused by design. */
  skippedMcq: number;
  unknownRows: number;
  malformedRows: number;
}

/** The spreadsheet round trip (§3.9). */
export const learnWorkbook = {
  /**
   * Downloads the progress sheet.
   *
   * `responseType: "blob"` matters: the default JSON parse would corrupt the
   * binary body, and the resulting file would fail to open with no clue why.
   */
  exportPath: async (slug: string): Promise<{ blob: Blob; filename: string }> => {
    const response = await api.get(`/api/learn/paths/${slug}/export`, {
      responseType: "blob",
    });

    // Prefer the server's filename, but never trust it as a path: strip any
    // directory separators a malformed header could smuggle in before it
    // reaches a download attribute.
    const disposition = String(response.headers["content-disposition"] ?? "");
    const match = /filename="?([^"]+)"?/.exec(disposition);
    const filename = (match?.[1] ?? `${slug}-progress.xlsx`).replace(/[/\\]/g, "");

    return { blob: response.data as Blob, filename };
  },

  importPath: async (slug: string, file: File): Promise<ImportSummary> => {
    const form = new FormData();
    form.append("file", file);

    // Content-Type is deliberately unset: the browser has to generate it so it
    // can append the multipart boundary. Setting it by hand omits the boundary
    // and multer rejects the body.
    return (await api.post(`/api/learn/paths/${slug}/import`, form)).data.data;
  },
};

/** Momentum loop (Phase 6). */
export interface Celebrations {
  modules: Array<{
    moduleId: number;
    title: string;
    completedQuestions: number;
    completedLessons: number;
  }>;
  lessons: Array<{ lessonId: number; title: string; totalQuestions: number }>;
  /** Suppressed lesson milestones to mark seen without showing (§3.6). */
  alsoAcknowledge: { lessonIds: number[] };
}

export interface NextQuestion {
  pathTitle: string;
  pathSlug: string;
  progress: { completedQuestions: number; totalQuestions: number } | null;
  next: {
    questionId: number;
    title: string;
    problemSlug: string | null;
    lessonId: number;
    lessonTitle: string;
    moduleTitle: string;
  } | null;
}

export const learnMomentum = {
  getCelebrations: async (pathSlug: string): Promise<Celebrations> =>
    (await api.get(`/api/learn/paths/${pathSlug}/celebrations`)).data.data,

  getNextQuestion: async (pathSlug: string, questionId: number): Promise<NextQuestion> =>
    (await api.get(`/api/learn/paths/${pathSlug}/questions/${questionId}/next`)).data.data,

  acknowledgeLesson: async (lessonId: number): Promise<void> => {
    await api.post(`/api/learn/lessons/${lessonId}/celebrated`);
  },

  acknowledgeModule: async (moduleId: number): Promise<void> => {
    await api.post(`/api/learn/modules/${moduleId}/celebrated`);
  },
};
