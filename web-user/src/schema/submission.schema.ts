import { z } from "zod";
import type { ContestWithQuestions } from "@/schema/contest.schema";
import { LanguageEnum } from "@/schema/language.schema";
import type { Language } from "@/schema/language.schema";

export const SubmitMcqSchema = z.object({
  selectedOptionIndex: z.number().int().min(0),
});

export const SubmitDsaSchema = z.object({
  code: z.string().min(1),
  language: LanguageEnum,
});

export type SubmitMcqSchemaType = z.infer<typeof SubmitMcqSchema>;
export type SubmitDsaSchemaType = z.infer<typeof SubmitDsaSchema>;

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

