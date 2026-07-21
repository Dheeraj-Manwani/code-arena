import { z } from "zod";
import { DifficultyEnum, ProblemVisibilityEnum } from "./problem.schema";

/** Mirrors api-http/src/schema/learn.schema.ts. */
export const LearnPathStatusEnum = z.enum(["draft", "published", "archived"]);
export type LearnPathStatus = z.infer<typeof LearnPathStatusEnum>;

export const LearnQuestionKindEnum = z.enum(["problem", "mcq"]);
export type LearnQuestionKind = z.infer<typeof LearnQuestionKindEnum>;

export const LEARN_PATH_STATUS_LABELS: Record<LearnPathStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

export interface LearnPathSummary {
  id: number;
  slug: string;
  title: string;
  description: string;
  status: LearnPathStatus;
  order: number;
  isFeatured: boolean;
  unlockThreshold: number;
  totalQuestions: number;
  totalModules: number;
  createdAt: string;
  updatedAt: string;
}

export interface LearnQuestionNode {
  id: number;
  kind: LearnQuestionKind;
  order: number;
  note: string | null;
  problemId: number | null;
  mcqId: number | null;
  problem: {
    id: number;
    slug: string;
    title: string;
    difficulty: z.infer<typeof DifficultyEnum>;
    visibility: z.infer<typeof ProblemVisibilityEnum>;
  } | null;
  /** Never carries `correctOptionIndex` — the server projection omits it. */
  mcq: {
    id: number;
    questionText: string;
    visibility: z.infer<typeof ProblemVisibilityEnum>;
  } | null;
}

export interface LearnLessonNode {
  id: number;
  slug: string;
  title: string;
  body: string | null;
  order: number;
  totalQuestions: number;
  questions: LearnQuestionNode[];
}

export interface LearnModuleNode {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  order: number;
  totalQuestions: number;
  lessons: LearnLessonNode[];
}

export interface LearnPathTree extends LearnPathSummary {
  modules: LearnModuleNode[];
}

export interface LearnPathValidation {
  publishable: boolean;
  problems: string[];
}

export interface LearnPathImpact {
  learners: number;
  status: LearnPathStatus;
}

export interface ProblemUsage {
  blockingContest: { id: number; title: string } | null;
  paths: Array<{ id: number; slug: string; title: string; status: LearnPathStatus }>;
}

/**
 * A slug the server will accept. Derived from the title as the curator types,
 * so the field is normally invisible — but it is editable, because a slug is a
 * URL and renaming a path should not silently break shared links.
 */
export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "untitled";

export const CreateLearnPathSchema = z.object({
  slug: z
    .string()
    .min(1, { message: "Slug is required" })
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "Lowercase letters, numbers and single hyphens only",
    }),
  title: z.string().min(1, { message: "Title is required" }).max(200),
  description: z.string().min(1, { message: "Description is required" }).max(1000),
  unlockThreshold: z.number().min(0).max(1).optional(),
});
export type CreateLearnPathInput = z.infer<typeof CreateLearnPathSchema>;
