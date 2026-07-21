/** Shapes returned by `/api/learn`. Mirrors api-http/src/service/learn.service.ts. */

export type LearnQuestionKind = "problem" | "mcq";

export interface LearnPathCard {
  slug: string;
  title: string;
  description: string;
  isFeatured: boolean;
  totalQuestions: number;
  totalModules: number;
  completedQuestions: number;
  started: boolean;
}

export type CompletionSource = "verified" | "self_marked";

export interface LearnQuestion {
  id: number;
  kind: LearnQuestionKind;
  note: string | null;
  isComplete: boolean;
  /**
   * How it was completed, or null. `verified` is backed by a real accepted
   * submission and cannot be un-ticked; `self_marked` is the user's own claim
   * about work done elsewhere, and can be.
   */
  completionSource: CompletionSource | null;
  problem: { slug: string; title: string; difficulty: "easy" | "medium" | "hard" } | null;
  /**
   * Text and options. Never `correctOptionIndex` — grading is a server
   * round-trip, so the answer key never reaches the browser (§5.7).
   */
  mcq: { questionText: string; options: string[] } | null;
}

export interface LearnLessonSummary {
  id: number;
  slug: string;
  title: string;
  hasBody: boolean;
  totalQuestions: number;
  completedQuestions: number;
  isComplete: boolean;
  questions: LearnQuestion[];
}

/**
 * Soft gating (§5.4). Advisory only: a locked module is dimmed and explains
 * itself, but nothing here should ever prevent opening it.
 */
export type ModuleGate =
  | { unlocked: true }
  | { unlocked: false; progress: number; required: number };

export interface LearnModuleSummary {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  totalQuestions: number;
  completedQuestions: number;
  isComplete: boolean;
  gate: ModuleGate;
  lessons: LearnLessonSummary[];
}

export interface LearnCurrentPointer {
  moduleSlug: string;
  moduleTitle: string;
  lessonId: number;
  lessonSlug: string;
  lessonTitle: string;
  questionId: number;
  questionTitle: string;
  problemSlug: string | null;
}

export interface LearnPathDetail {
  slug: string;
  title: string;
  description: string;
  totalQuestions: number;
  completedQuestions: number;
  totalModules: number;
  completedModules: number;
  verifiedQuestions: number;
  /** Null when the path is finished — the UI shows the terminal state instead. */
  current: LearnCurrentPointer | null;
  modules: LearnModuleSummary[];
}

export interface LearnLessonDetail {
  id: number;
  slug: string;
  title: string;
  body: string | null;
  module: {
    slug: string;
    title: string;
    pathSlug: string;
    pathTitle: string;
  };
  totalQuestions: number;
  completedQuestions: number;
  questions: LearnQuestion[];
}

/** Guards a division that would otherwise be NaN on an empty container. */
export const percent = (completed: number, total: number): number =>
  total <= 0 ? 0 : Math.round((completed / total) * 100);
