import { z } from "zod";
import { DifficultyEnum } from "./problem.schema";

/** Sort keys the catalogue supports. Mirrors `ProblemSortEnum` in api-http. */
export const ProblemSortEnum = z.enum([
  "newest",
  "oldest",
  "difficulty-asc",
  "difficulty-desc",
  "title",
  "acceptance-asc",
  "acceptance-desc",
  "most-solved",
]);
export type ProblemSort = z.infer<typeof ProblemSortEnum>;

/** The caller's own standing on a problem; `null` = never attempted. */
export const SolveStatusEnum = z.enum(["attempted", "solved"]);
export type SolveStatus = z.infer<typeof SolveStatusEnum>;

export const ProblemStatusFilterEnum = z.enum(["solved", "attempted", "todo"]);
export type ProblemStatusFilter = z.infer<typeof ProblemStatusFilterEnum>;

/** A row in the catalogue list. Deliberately has no `description`. */
export const CatalogueProblemSchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  title: z.string(),
  tags: z.array(z.string()),
  difficulty: DifficultyEnum,
  points: z.number().int(),
  createdAt: z.string(),
  /** 0..1, not a percentage. */
  acceptanceRate: z.number(),
  solvedBy: z.number().int(),
  totalSubmissions: z.number().int(),
  status: SolveStatusEnum.nullable(),
});
export type CatalogueProblem = z.infer<typeof CatalogueProblemSchema>;

export const PaginationMetaSchema = z.object({
  totalItems: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export const CatalogueResponseSchema = z.object({
  problems: z.array(CatalogueProblemSchema),
  meta: PaginationMetaSchema,
});
export type CatalogueResponse = z.infer<typeof CatalogueResponseSchema>;

export const PracticeProblemSchema = CatalogueProblemSchema.extend({
  description: z.string(),
  // Inherits acceptanceRate / solvedBy / totalSubmissions / status from
  // CatalogueProblemSchema — the detail endpoint returns the same stats.
  timeLimit: z.number().int(),
  memoryLimit: z.number().int(),
  inputFormat: z.string().nullable(),
  outputFormat: z.string().nullable(),
  constraints: z.array(z.string()),
  sampleTestCases: z.array(
    z.object({ input: z.string(), expectedOutput: z.string() }),
  ),
  boilerplate: z.record(z.string(), z.string()),
  /** Drives the /api/run harness, same as contest DSA payloads. */
  signature: z.unknown().nullable(),
});
export type PracticeProblem = z.infer<typeof PracticeProblemSchema>;

export const SubmissionStatusEnum = z.enum([
  "pending",
  "accepted",
  "wrong_answer",
  "time_limit_exceeded",
  "runtime_error",
]);
export type SubmissionStatus = z.infer<typeof SubmissionStatusEnum>;

export const PracticeSubmissionSchema = z.object({
  id: z.number().int(),
  status: SubmissionStatusEnum,
  language: z.string(),
  testCasesPassed: z.number().int(),
  totalTestCases: z.number().int(),
  executionTime: z.number().nullable(),
  submittedAt: z.string(),
});
export type PracticeSubmission = z.infer<typeof PracticeSubmissionSchema>;

export interface PracticeSubmitResult {
  practiceSubmissionId: number;
  problemId: number;
  status: "pending";
  testCasesPassed: number;
  totalTestCases: number;
}

export interface PracticeDraft {
  code: string;
  language: string;
}

export interface ProblemFilters {
  page: number;
  limit: number;
  search?: string;
  difficulty?: z.infer<typeof DifficultyEnum>;
  tags?: string[];
  status?: ProblemStatusFilter;
  sortBy: ProblemSort;
}
