import { z } from "zod";
import type { ContestQuestion } from "./problem.schema";
import { ContestWithQuestions } from "./contest.schema";

export const SubmitMcqSchema = z.object({
  selectedOptionIndex: z.number().int().min(0),
});

export const SubmitDsaSchema = z.object({
  code: z.string().min(1),
  language: z.string().min(1),
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
  language?: string;
  mcqOption?: number;
}

/** Contest attempt summary for My Contests / results. Used when an attempts API exists. */
export interface ContestAttempt {
  id: number;
  contestId: number;
  status: AttemptStatus;

  startedAt: string;
  deadlineAt: string;

  draftAnswers: DraftAnswer[];
  contest: ContestWithQuestions;
}

