import { z } from "zod";

export interface JudgeJob {
  jobId: string;
  dsaSubmissionId: number;
  attemptId: number;
  userId: number;
  problemId: number;
  contestId: number;
  language: "cpp" | "python" | "javascript" | "java";
  sourceCode: string;
  totalTestCases: number;
  totalPoints: number;
}

export const judgeJobSchema = z.object({
  jobId: z.string(),
  dsaSubmissionId: z.number(),
  attemptId: z.number(),
  userId: z.number(),
  problemId: z.number(),
  contestId: z.number(),
  language: z.enum(["cpp", "python", "javascript", "java"]),
  sourceCode: z.string(),
  totalTestCases: z.number(),
  totalPoints: z.number(),
});

export function parseJob(data: unknown): JudgeJob {
  return judgeJobSchema.parse(data);
}

export interface UpdateSubmissionPayload {
  status: "accepted" | "wrong_answer" | "time_limit_exceeded" | "runtime_error";
  pointsEarned: number;
  testCasesPassed: number;
  totalTestCases: number;
  executionTime: number | null;
}
