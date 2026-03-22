import { z } from "zod";

export const DifficultyEnum = z.enum(["easy", "medium", "hard"]);
export type Difficulty = z.infer<typeof DifficultyEnum>;

export const McqQuestionSchema = z.object({
  id: z.number(),
  questionText: z.string(),
  options: z.array(z.string()),
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
  isHidden: z.boolean().optional().default(false),
  createdAt: z.union([z.string(), z.date()]),
  problemId: z.number(),
  isCustom: z.boolean().optional().default(false),
});

export const DsaProblemSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  points: z.number().int(),
  timeLimit: z.number().int(),
  memoryLimit: z.number().int(),
  difficulty: DifficultyEnum.nullable().optional(),
  maxDurationMs: z.number().nullable().optional(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
  creatorId: z.number(),
  testCases: z.array(TestCaseSchema),

  boilerplate: z.record(z.string(), z.string()).optional().default({}),
  inputFormat: z.string().nullable().optional(),
  outputFormat: z.string().nullable().optional(),
  constraints: z.array(z.string()).optional().default([]),
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

export interface TestCaseUI {
  id: number;
  input: string;
  expectedOutput: string;
  isCustom?: boolean;
}

export interface TestCaseResult {
  id: number;
  passed: boolean;
  actualOutput: string;
}

export interface ContestMcq extends McqQuestion {
  order: number;
  type: "mcq";
}

export interface ContestDsa extends DsaProblem {
  order: number;
  type: "dsa";
}

export type ContestQuestion = ContestMcq | ContestDsa;

export const QuestionTypeEnum = z.enum(["mcq", "dsa"]);

export type QuestionType = z.infer<typeof QuestionTypeEnum>;

/** Boilerplate signature sent to backend; backend generates boilerplate from this */
const BOILERPLATE_TYPE_KEYS = [
  "int", "long", "double", "boolean", "string",
  "int[]", "long[]", "double[]", "boolean[]", "string[]", "int[][]",
  "ListNode", "TreeNode", "void", "object",
] as const;
const BoilerplateTypeKeyEnum = z.enum(BOILERPLATE_TYPE_KEYS);
const BoilerplateParamSchema = z.object({ name: z.string(), type: BoilerplateTypeKeyEnum });
const BoilerplateSignatureSchema = z.object({
  functionName: z.string(),
  returnType: BoilerplateTypeKeyEnum,
  parameters: z.array(BoilerplateParamSchema),
  className: z.string(),
  useClassWrapper: z.boolean(),
});

export const UpdateDsaSchema = z
  .object({
    title: z
      .string()
      .min(1, { message: "Title is required" })
      .max(200, { message: "Title must not exceed 200 characters" })
      .optional(),
    description: z
      .string()
      .min(1, { message: "Description is required" })
      .max(5000, { message: "Description must not exceed 5000 characters" })
      .optional(),
    tags: z
      .array(
        z
          .string()
          .max(50, { message: "Each tag must not exceed 50 characters" }),
      )
      .optional(),
    points: z
      .number()
      .int()
      .min(1, { message: "Points must be at least 1" })
      .optional(),
    timeLimit: z
      .number()
      .int()
      .min(1, { message: "Time limit is required" })
      .optional(),
    memoryLimit: z
      .number()
      .int()
      .min(1, { message: "Memory limit is required" })
      .optional(),
    difficulty: DifficultyEnum.optional(),
    maxDurationMs: z
      .number()
      .int()
      .min(60 * 1_000, { message: "Duration must be at least 1 minute" })
      .optional(),
    testCases: z
      .array(
        z.object({
          input: z
            .string()
            .min(1, { message: "Input is required" })
            .max(5000, { message: "Input must not exceed 5000 characters" }),
          expectedOutput: z
            .string()
            .min(1, { message: "Expected output is required" })
            .max(5000, {
              message: "Expected output must not exceed 5000 characters",
            }),
          isHidden: z.boolean().default(false),
        }),
      )
      .min(1, { message: "At least one test case is required" })
      .optional(),
    boilerplate: z.record(z.string(), z.string()).optional(),
    /** When provided, backend generates boilerplate; do not send boilerplate */
    boilerplateSignature: BoilerplateSignatureSchema.optional(),
    inputFormat: z.string().nullable().optional(),
    outputFormat: z.string().nullable().optional(),
    constraints: z.array(z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    const fieldsProvided = Object.values(data).some(
      (value) => value !== undefined,
    );

    if (!fieldsProvided) {
      ctx.addIssue({
        code: "custom",
        message: "At least one field must be provided for update",
        path: [],
      });
    }
  });

export const AddMcqSchema = z
  .object({
    questionText: z
      .string()
      .min(1, { message: "Question text is required" })
      .max(1000, { message: "Question text must not exceed 1000 characters" }),
    options: z
      .array(
        z
          .string()
          .max(500, { message: "Each option must not exceed 500 characters" }),
      )
      .min(2, { message: "At least 2 options are required" }),
    correctOptionIndex: z.number().int(),
    points: z
      .number()
      .int()
      .min(1, { message: "Points must be at least 1" })
      .default(1),
    maxDurationMs: z
      .number()
      .int()
      .min(60 * 1_000, { message: "Max duration must be at least 1 minute" })
      .optional(),
  })
  .refine(
    (data) =>
      data.correctOptionIndex < data.options.length &&
      data.correctOptionIndex >= 0,
    {
      message: "Invalid correct option",
      path: ["correctOptionIndex"],
    },
  );

export const AddTestCaseSchema = z
  .array(
    z.object({
      input: z
        .string()
        .min(1, { message: "Input is required" })
        .max(5000, { message: "Input must not exceed 5000 characters" }),
      expectedOutput: z
        .string()
        .min(1, { message: "Expected output is required" })
        .max(5000, {
          message: "Expected output must not exceed 5000 characters",
        }),
      isHidden: z.boolean().default(false),
    }),
  )
  .min(1, { message: "At least one test case is required" });

export const AddDsaSchema = z.object({
  title: z
    .string()
    .min(1, { message: "Title is required" })
    .max(200, { message: "Title must not exceed 200 characters" }),
  description: z
    .string()
    .min(1, { message: "Description is required" })
    .max(5000, { message: "Description must not exceed 5000 characters" }),
  tags: z.array(
    z.string().max(50, { message: "Each tag must not exceed 50 characters" }),
  ),
  points: z
    .number()
    .int()
    .min(1, { message: "Points must be at least 1" })
    .default(100),
  timeLimit: z
    .number()
    .int()
    .min(1, { message: "Time limit is required" })
    .default(2000),
  memoryLimit: z
    .number()
    .int()
    .min(1, { message: "Memory limit is required" })
    .default(256),
  difficulty: DifficultyEnum.optional(),
  maxDurationMs: z
    .number()
    .int()
    .min(60 * 1_000, { message: "Duration must be at least 1 minute" })
    .optional(),
  testCases: AddTestCaseSchema.default([]),
  /** Prefer boilerplateSignature when present (backend generates boilerplate) */
  boilerplate: z.record(z.string(), z.string()).default({}).optional(),
  boilerplateSignature: BoilerplateSignatureSchema.optional(),
  inputFormat: z.string().nullable().optional(),
  outputFormat: z.string().nullable().optional(),
  constraints: z.array(z.string()).optional().default([]),
});

export const UpdateMcqSchema = z
  .object({
    questionText: z
      .string()
      .min(1, { message: "Question text is required" })
      .max(1000, { message: "Question text must not exceed 1000 characters" })
      .optional(),
    options: z
      .array(
        z
          .string()
          .max(500, { message: "Each option must not exceed 500 characters" }),
      )
      .min(2, { message: "At least 2 options are required" })
      .optional(),
    correctOptionIndex: z.number().int().optional(),
    points: z
      .number()
      .int()
      .min(1, { message: "Points must be at least 1" })
      .optional(),
    maxDurationMs: z
      .number()
      .int()
      .min(60 * 1_000, { message: "Max duration must be at least 1 minute" })
      .optional(),
  })
  .superRefine((data, ctx) => {
    const fieldsProvided = Object.values(data).some(
      (value) => value !== undefined,
    );

    if (!fieldsProvided) {
      ctx.addIssue({
        code: "custom",
        message: "At least one field must be provided for update",
        path: [],
      });
    }

    if (data.options !== undefined && data.correctOptionIndex !== undefined) {
      if (
        data.correctOptionIndex < 0 ||
        data.correctOptionIndex >= data.options.length
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Invalid correct option",
          path: ["correctOptionIndex"],
        });
      }
    } else if (
      data.correctOptionIndex !== undefined &&
      data.options === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Options must be provided when updating correctOptionIndex",
        path: ["correctOptionIndex"],
      });
    }
  });

export type AddMcqType = z.infer<typeof AddMcqSchema>;
export type AddDsaType = z.infer<typeof AddDsaSchema>;
export type AddTestCaseType = z.infer<typeof AddTestCaseSchema>;
export type UpdateMcqType = z.infer<typeof UpdateMcqSchema>;
export type UpdateDsaType = z.infer<typeof UpdateDsaSchema>;
