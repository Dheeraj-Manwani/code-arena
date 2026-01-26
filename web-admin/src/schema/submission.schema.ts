import { z } from "zod";

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

/** Contest attempt summary for My Contests / results. Used when an attempts API exists. */
export interface ContestAttempt {
  id: number;
  contestId: number;
  contestTitle: string;
  contestType?: string;
  status: string;
  totalPoints: number;
  maxPoints: number;
  durationMs: number;
  startedAt?: Date | string;
  submittedAt?: Date | string;
  rank?: number;
}

