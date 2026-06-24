import type { AttemptStatus, ContestType } from "@/schema/submission.schema";

/** One row in the My Contests list (GET /api/attempts). */
export interface AttemptSummary {
  id: number;
  contestId: number;
  contestTitle: string;
  contestType: ContestType;
  status: AttemptStatus;
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

export type AttemptResultVerdict =
  | "correct"
  | "incorrect"
  | "accepted"
  | "wrong_answer"
  | "time_limit_exceeded"
  | "runtime_error"
  | "pending"
  | "not_attempted";

/** Per-question breakdown on the results screen (GET /api/attempts/:id/results). */
export interface AttemptResultQuestion {
  contestQuestionId: number;
  order: number;
  type: "mcq" | "dsa";
  title: string;
  points: number;
  pointsEarned: number;
  attempted: boolean;
  verdict: AttemptResultVerdict;
  testCasesPassed?: number;
  totalTestCases?: number;
}

export interface AttemptResultResponse {
  id: number;
  contestId: number;
  contestTitle: string;
  contestType: ContestType;
  status: AttemptStatus;
  startedAt: string;
  submittedAt: string | null;
  durationMs: number | null;
  totalPoints: number;
  maxPoints: number;
  rank: number | null;
  totalParticipants: number;
  questions: AttemptResultQuestion[];
}
