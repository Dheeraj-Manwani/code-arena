/**
 * Where a judge verdict lands.
 *
 * Contest and practice submissions share the judge pipeline but live in
 * different tables (PRACTICE_MODE_AND_NAVIGATION.md §4.1). This is a
 * discriminated union rather than a bag of optional ids so the compiler forces
 * every consumer to say which case it is handling — a job can't silently be
 * "contest with a missing contestId".
 */
export type JudgeTarget =
  | {
      kind: "contest";
      dsaSubmissionId: number;
      attemptId: number;
      contestId: number;
    }
  | {
      kind: "practice";
      practiceSubmissionId: number;
    };

/** The submission row id, whichever table it lives in — for logging. */
export function targetSubmissionId(target: JudgeTarget): number {
  return target.kind === "contest"
    ? target.dsaSubmissionId
    : target.practiceSubmissionId;
}

/**
 * The judge-side language vocabulary.
 *
 * Distinct from `schema/language.schema.ts`'s `Language`, which is the app-side
 * spelling ("js" there, "javascript" here). `LANGUAGE_TO_JUDGE_JOB` in
 * `jobs/constants.ts` is the one place that translates between them.
 */
export type JudgeLanguage = "cpp" | "python" | "javascript" | "java";

export interface JudgeJob {
  jobId: string;
  target: JudgeTarget;
  userId: number;
  problemId: number;
  language: JudgeLanguage;
  sourceCode: string;
  totalTestCases: number;
  totalPoints: number;
}

export interface UpdateSubmissionPayload {
  status: "accepted" | "wrong_answer" | "time_limit_exceeded" | "runtime_error";
  pointsEarned: number;
  testCasesPassed: number;
  totalTestCases: number;
  executionTime: number | null;
}
