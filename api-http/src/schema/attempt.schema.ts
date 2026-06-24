import { z } from "zod";
import { AttemptStatusEnum, ContestTypeEnum, SubmissionStatusEnum } from "./submission.schema";

/** Query params for GET /api/attempts (paginated list of the caller's attempts). */
export const ListAttemptsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => parseInt(v ?? "1", 10))
    .pipe(z.number().int().min(1))
    .default(1),
  limit: z
    .string()
    .optional()
    .transform((v) => parseInt(v ?? "10", 10))
    .pipe(z.number().int().min(1).max(50))
    .default(10),
});

export type ListAttemptsQuery = z.infer<typeof ListAttemptsQuerySchema>;

/** One row in the My Contests list. */
export interface AttemptSummary {
  id: number;
  contestId: number;
  contestTitle: string;
  contestType: z.infer<typeof ContestTypeEnum>;
  status: z.infer<typeof AttemptStatusEnum>;
  startedAt: string;
  submittedAt: string | null;
  durationMs: number | null;
  totalPoints: number;
  maxPoints: number;
  rank: number | null;
}

export interface AttemptListResponse {
  attempts: AttemptSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Per-question breakdown on the results screen. */
export interface AttemptResultQuestion {
  contestQuestionId: number;
  order: number;
  type: "mcq" | "dsa";
  title: string;
  points: number;
  pointsEarned: number;
  attempted: boolean;
  /** Normalised verdict for display. */
  verdict:
    | "correct"
    | "incorrect"
    | "accepted"
    | "wrong_answer"
    | "time_limit_exceeded"
    | "runtime_error"
    | "pending"
    | "not_attempted";
  /** DSA-only test case progress. */
  testCasesPassed?: number;
  totalTestCases?: number;
}

export interface AttemptResultResponse {
  id: number;
  contestId: number;
  contestTitle: string;
  contestType: z.infer<typeof ContestTypeEnum>;
  status: z.infer<typeof AttemptStatusEnum>;
  startedAt: string;
  submittedAt: string | null;
  durationMs: number | null;
  totalPoints: number;
  maxPoints: number;
  rank: number | null;
  totalParticipants: number;
  questions: AttemptResultQuestion[];
}

export { SubmissionStatusEnum };
