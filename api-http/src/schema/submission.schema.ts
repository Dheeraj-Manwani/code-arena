import { z } from "zod";
import { BoilerplateSignatureSchema, type ContestQuestion } from "./problem.schema";
import { ContestWithQuestions } from "./contest.schema";
import { LanguageEnum, type Language } from "./language.schema";

export const SubmitMcqSchema = z.object({
  selectedOptionIndex: z.number().int().min(0),
});

export const SubmitDsaSchema = z.object({
  code: z.string().min(1),
  language: LanguageEnum,
});

/** POST /api/run — optional signature + testCases to wrap code with judge harness (same as submissions). */
export const RunCodeSchema = SubmitDsaSchema.extend({
  signature: BoilerplateSignatureSchema.optional(),
  testCases: z
    .array(
      z.object({
        input: z.string(),
        expectedOutput: z.string(),
      })
    )
    .optional(),
});

export const RunCodeBodySchema = RunCodeSchema;

export type SubmitMcqSchemaType = z.infer<typeof SubmitMcqSchema>;
export type SubmitDsaSchemaType = z.infer<typeof SubmitDsaSchema>;
export type RunCodeSchemaType = z.infer<typeof RunCodeSchema>;
export type RunCodeBodySchemaType = z.infer<typeof RunCodeBodySchema>;

export const AttemptStatusEnum = z.enum(["in_progress", "submitted", "timed_out", "abandoned"]);
export type AttemptStatus = z.infer<typeof AttemptStatusEnum>;

export const SubmissionStatusEnum = z.enum(["pending", "accepted", "wrong_answer", "time_limit_exceeded", "runtime_error"]);
export type SubmissionStatus = z.infer<typeof SubmissionStatusEnum>;

export const ContestTypeEnum = z.enum(["practice", "competitive"]);
export type ContestType = z.infer<typeof ContestTypeEnum>;

export interface DraftAnswer {
  id: number;
  attemptId: number;
  problemId: number;
  code?: string;
  /** Validated language from DB; may be undefined if stored value is invalid */
  language?: Language;
  mcqOption?: number;
}

/** Contest attempt summary for My Contests / results. Used when an attempts API exists. */
export interface ContestAttempt {
  id: number;
  contestId: number;
  status: AttemptStatus;

  startedAt: string;
  deadlineAt: string;

  /** Question/problem ID the user is currently on (UI opens this problem). */
  currentProblemId?: number;

  draftAnswers: DraftAnswer[];
  contest: ContestWithQuestions;
}

