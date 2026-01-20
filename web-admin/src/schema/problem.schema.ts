import { z } from "zod";

export const McqQuestionSchema = z.object({
  id: z.number(),
  questionText: z.string(),
  options: z.union([z.array(z.string()), z.string()]).transform((val) => {
    if (Array.isArray(val)) return val;
    try {
      return JSON.parse(val);
    } catch {
      return [];
    }
  }),
  correctOptionIndex: z.number().int(),
  points: z.number().int(),
  maxDurationMs: z.number().nullable().optional(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
  creatorId: z.number(),
});

export const TestCaseSchema = z.object({
  id: z.number(),
  input: z.string(),
  expectedOutput: z.string(),
  isHidden: z.boolean(),
  createdAt: z.union([z.string(), z.date()]),
  problemId: z.number(),
});

export const DsaProblemSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  points: z.number().int(),
  timeLimit: z.number().int(),
  memoryLimit: z.number().int(),
  difficulty: z.enum(["easy", "medium", "hard"]).nullable().optional(),
  maxDurationMs: z.number().nullable().optional(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
  creatorId: z.number(),
  testCases: z.array(TestCaseSchema).optional(),
});

export const McqQuestionsResponseSchema = z.object({
  questions: z.array(McqQuestionSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export const DsaProblemsResponseSchema = z.object({
  problems: z.array(DsaProblemSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export type McqQuestion = z.infer<typeof McqQuestionSchema>;
export type DsaProblem = z.infer<typeof DsaProblemSchema>;
export type TestCase = z.infer<typeof TestCaseSchema>;
export type McqQuestionsResponse = z.infer<typeof McqQuestionsResponseSchema>;
export type DsaProblemsResponse = z.infer<typeof DsaProblemsResponseSchema>;


export interface ContestMcq extends McqQuestion {
  order: number;
}

export interface ContestDsa extends DsaProblem {
  order: number;
}

export type ContestQuestion = 
  | ({ type: 'mcq' } & ContestMcq)
  | ({ type: 'dsa' } & ContestDsa);