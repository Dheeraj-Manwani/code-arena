import { z } from "zod";

export const DifficultyEnum = z.enum(["easy", "medium", "hard"]);
export const ContestTypeEnum = z.enum(["practice", "competitive"]);
export const ContestStatusEnum = z.enum(["draft", "scheduled", "running", "ended", "cancelled"]);

export const CreateContestSchema = z
  .object({
    title: z.string().min(1, { message: "Title is required" }).max(200, { message: "Title must not exceed 200 characters" }),
    description: z.string().min(1, { message: "Description is required" }).max(5000, { message: "Description must not exceed 5000 characters" }),
    startTime: z.iso.datetime().optional(),
    endTime: z.iso.datetime().optional(),
    type: ContestTypeEnum.optional().default("practice"),
    status: ContestStatusEnum.optional().default("draft"),
    maxDurationMs: z.number().int().min(60 * 1_000, { message: "Max duration must be at least 1 minute" }).optional(),
    questions: z.array(
      z.object({
        type: z.enum(["mcq", "dsa"]),
        id: z.number().int().positive(),
        order: z.number().int().nonnegative(),
      })
    ).optional().default([]),
  })
  .superRefine((data, ctx) => {
    const now = new Date();
    const isPractice = data.type === "practice";
    const isCompetitive = data.type === "competitive";

    // Practice contests: maxDurationMs is required and must be at least 1 minute
    if (isPractice) {
      if (!data.maxDurationMs) {
        ctx.addIssue({
          code: 'custom',
          message: "Max duration is required for practice contests",
          path: ["maxDurationMs"],
        });
      } else if (data.maxDurationMs < 60 * 1_000) {
        ctx.addIssue({
          code: 'custom',
          message: "Max duration must be at least 1 minute",
          path: ["maxDurationMs"],
        });
      }
    }

    // Competitive contests: startTime and endTime are required, maxDurationMs is not needed
    if (isCompetitive) {
      if (!data.startTime) {
        ctx.addIssue({
          code: 'custom',
          message: "Start time is required for competitive contests",
          path: ["startTime"],
        });
      }
      if (!data.endTime) {
        ctx.addIssue({
          code: 'custom',
          message: "End time is required for competitive contests",
          path: ["endTime"],
        });
      }
    }

    if (data.startTime) {
      const startDate = new Date(data.startTime);
      if (startDate < now) {
        ctx.addIssue({
          code: 'custom',
          message: "Start time cannot be in the past",
          path: ["startTime"],
        });
      }
    }

    if (data.endTime) {
      const endDate = new Date(data.endTime);
      if (endDate < now) {
        ctx.addIssue({
          code: 'custom',
          message: "End time cannot be in the past",
          path: ["endTime"],
        });
      }
    }

    if (data.startTime && data.endTime) {
      const startDate = new Date(data.startTime);
      const endDate = new Date(data.endTime);

      if (endDate < startDate) {
        ctx.addIssue({
          code: 'custom',
          message: "End time must be greater than or equal to start time",
          path: ["endTime"],
        });
      }
    }

  });

export const UpdateContestSchema = z
  .object({
    title: z.string().min(1, { message: "Title is required" }).max(200, { message: "Title must not exceed 200 characters" }).optional(),
    description: z.string().min(1, { message: "Description is required" }).max(5000, { message: "Description must not exceed 5000 characters" }).optional(),
    startTime: z.union([z.iso.datetime(), z.null()]).optional(),
    endTime: z.union([z.iso.datetime(), z.null()]).optional(),
    type: ContestTypeEnum.optional(),
    status: ContestStatusEnum.optional(),
    maxDurationMs: z.union([z.number().int().min(60 * 1_000, { message: "Max duration must be at least 1 minute" }), z.null()]).optional(),
    questions: z.array(
      z.object({
        type: z.enum(["mcq", "dsa"]),
        id: z.number().int().positive(),
        order: z.number().int().nonnegative(),
      })
    ).optional(),
  })
  .superRefine((data, ctx) => {
    const fieldsProvided = Object.values(data).some(
      (value) => value !== undefined
    );

    if (!fieldsProvided) {
      ctx.addIssue({
        code: "custom",
        message: "At least one field must be provided for update",
        path: [],
      });
    }

    const now = new Date();
    const isPractice = data.type === "practice";
    const isCompetitive = data.type === "competitive";

    // Practice contests: maxDurationMs is required and must be at least 1 minute
    if (isPractice) {
      if (data.maxDurationMs === undefined || data.maxDurationMs === null) {
        ctx.addIssue({
          code: 'custom',
          message: "Max duration is required for practice contests",
          path: ["maxDurationMs"],
        });
      } else if (data.maxDurationMs < 60 * 1_000) {
        ctx.addIssue({
          code: 'custom',
          message: "Max duration must be at least 1 minute",
          path: ["maxDurationMs"],
        });
      }
      // For practice contests, startTime and endTime should be null
      if (data.startTime !== undefined && data.startTime !== null) {
        ctx.addIssue({
          code: 'custom',
          message: "Start time is not needed for practice contests",
          path: ["startTime"],
        });
      }
      if (data.endTime !== undefined && data.endTime !== null) {
        ctx.addIssue({
          code: 'custom',
          message: "End time is not needed for practice contests",
          path: ["endTime"],
        });
      }
    }

    // Competitive contests: startTime and endTime are required, maxDurationMs is not needed
    if (isCompetitive) {
      if (data.startTime === undefined || data.startTime === null) {
        ctx.addIssue({
          code: 'custom',
          message: "Start time is required for competitive contests",
          path: ["startTime"],
        });
      }
      if (data.endTime === undefined || data.endTime === null) {
        ctx.addIssue({
          code: 'custom',
          message: "End time is required for competitive contests",
          path: ["endTime"],
        });
      }
      // For competitive contests, maxDurationMs should be null
      if (data.maxDurationMs !== undefined && data.maxDurationMs !== null) {
        ctx.addIssue({
          code: 'custom',
          message: "Max duration is not needed for competitive contests",
          path: ["maxDurationMs"],
        });
      }
    }

    if (data.startTime && typeof data.startTime === 'string') {
      const startDate = new Date(data.startTime);
      if (startDate < now) {
        ctx.addIssue({
          code: 'custom',
          message: "Start time cannot be in the past",
          path: ["startTime"],
        });
      }
    }

    if (data.endTime && typeof data.endTime === 'string') {
      const endDate = new Date(data.endTime);
      if (endDate < now) {
        ctx.addIssue({
          code: 'custom',
          message: "End time cannot be in the past",
          path: ["endTime"],
        });
      }
    }

    if (data.startTime && data.endTime && typeof data.startTime === 'string' && typeof data.endTime === 'string') {
      const startDate = new Date(data.startTime);
      const endDate = new Date(data.endTime);

      if (endDate < startDate) {
        ctx.addIssue({
          code: 'custom',
          message: "End time must be greater than or equal to start time",
          path: ["endTime"],
        });
      }
    }

    // If maxDurationMs is provided (and not null), it must be at least 1 minute
    if (data.maxDurationMs !== undefined && data.maxDurationMs !== null && data.maxDurationMs < 60 * 1_000) {
      ctx.addIssue({
        code: 'custom',
        message: "Max duration must be at least 1 minute",
        path: ["maxDurationMs"],
      });
    }
  });

export const AddMcqSchema = z
  .object({
    questionText: z.string().min(1, { message: "Question text is required" }).max(1000, { message: "Question text must not exceed 1000 characters" }),
    options: z.array(z.string().max(500, { message: "Each option must not exceed 500 characters" })).min(2, { message: "At least 2 options are required" }),
    correctOptionIndex: z.number().int(),
    points: z.number().int().min(1, { message: "Points must be at least 1" }).default(1),
    maxDurationMs: z.number().int().min(60 * 1_000, { message: "Max duration must be at least 1 minute" }).optional(),
  })
  .refine((data) => data.correctOptionIndex < data.options.length && data.correctOptionIndex >= 0, {
    message: "Invalid correct option",
    path: ["correctOptionIndex"],
  });

export const AddTestCaseSchema = z
  .array(
    z.object({
      input: z.string().min(1, { message: "Input is required" }).max(5000, { message: "Input must not exceed 5000 characters" }),
      expectedOutput: z.string().min(1, { message: "Expected output is required" }).max(5000, { message: "Expected output must not exceed 5000 characters" }),
      isHidden: z.boolean().default(false),
    })
  )
  .min(1, { message: "At least one test case is required" });

export const AddDsaSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }).max(200, { message: "Title must not exceed 200 characters" }),
  description: z.string().min(1, { message: "Description is required" }).max(5000, { message: "Description must not exceed 5000 characters" }),
  tags: z.array(z.string().max(50, { message: "Each tag must not exceed 50 characters" })),
  points: z.number().int().min(1, { message: "Points must be at least 1" }).default(100),
  timeLimit: z.number().int().min(1, { message: "Time limit is required" }).default(2000),
  memoryLimit: z.number().int().min(1, { message: "Memory limit is required" }).default(256),
  difficulty: DifficultyEnum.optional(),
  maxDurationMs: z.number().int().min(60 * 1_000, { message: "Duration must be at least 1 minute" }).optional(),
  testCases: AddTestCaseSchema.default([]),
});

export const UpdateMcqSchema = z
  .object({
    questionText: z.string().min(1, { message: "Question text is required" }).max(1000, { message: "Question text must not exceed 1000 characters" }).optional(),
    options: z.array(z.string().max(500, { message: "Each option must not exceed 500 characters" })).min(2, { message: "At least 2 options are required" }).optional(),
    correctOptionIndex: z.number().int().optional(),
    points: z.number().int().min(1, { message: "Points must be at least 1" }).optional(),
    maxDurationMs: z.number().int().min(60 * 1_000, { message: "Max duration must be at least 1 minute" }).optional(),
  })
  .superRefine((data, ctx) => {
    const fieldsProvided = Object.values(data).some(
      (value) => value !== undefined
    );

    if (!fieldsProvided) {
      ctx.addIssue({
        code: "custom",
        message: "At least one field must be provided for update",
        path: [],
      });
    }

    if (data.options !== undefined && data.correctOptionIndex !== undefined) {
      if (data.correctOptionIndex < 0 || data.correctOptionIndex >= data.options.length) {
        ctx.addIssue({
          code: 'custom',
          message: "Invalid correct option",
          path: ["correctOptionIndex"],
        });
      }
    } else if (data.correctOptionIndex !== undefined && data.options === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: "Options must be provided when updating correctOptionIndex",
        path: ["correctOptionIndex"],
      });
    }
  });

export const UpdateDsaSchema = z
  .object({
    title: z.string().min(1, { message: "Title is required" }).max(200, { message: "Title must not exceed 200 characters" }).optional(),
    description: z.string().min(1, { message: "Description is required" }).max(5000, { message: "Description must not exceed 5000 characters" }).optional(),
    tags: z.array(z.string().max(50, { message: "Each tag must not exceed 50 characters" })).optional(),
    points: z.number().int().min(1, { message: "Points must be at least 1" }).optional(),
    timeLimit: z.number().int().min(1, { message: "Time limit is required" }).optional(),
    memoryLimit: z.number().int().min(1, { message: "Memory limit is required" }).optional(),
    difficulty: DifficultyEnum.optional(),
    maxDurationMs: z.number().int().min(60 * 1_000, { message: "Duration must be at least 1 minute" }).optional(),
    testCases: z.array(
      z.object({
        input: z.string().min(1, { message: "Input is required" }).max(5000, { message: "Input must not exceed 5000 characters" }),
        expectedOutput: z.string().min(1, { message: "Expected output is required" }).max(5000, { message: "Expected output must not exceed 5000 characters" }),
        isHidden: z.boolean().default(false),
      })
    ).min(1, { message: "At least one test case is required" }).optional(),
  })
  .superRefine((data, ctx) => {
    const fieldsProvided = Object.values(data).some(
      (value) => value !== undefined
    );

    if (!fieldsProvided) {
      ctx.addIssue({
        code: "custom",
        message: "At least one field must be provided for update",
        path: [],
      });
    }
  });



// Contest schema matching the API response from getAllContests
export const ContestSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  startTime: z.union([z.string(), z.date(), z.null()]),
  endTime: z.union([z.string(), z.date(), z.null()]),
  maxDurationMs: z.number().nullable(),
  type: ContestTypeEnum,
  status: ContestStatusEnum,
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
  creatorId: z.number(),
  mcqs: z.array(z.any()).optional(),
  dsaProblems: z.array(z.any()).optional(),
});

// Export types
export type CreateContestInput = z.infer<typeof CreateContestSchema>;
export type UpdateContestInput = z.infer<typeof UpdateContestSchema>;
export type AddMcqType = z.infer<typeof AddMcqSchema>;
export type AddDsaType = z.infer<typeof AddDsaSchema>;
export type AddTestCaseType = z.infer<typeof AddTestCaseSchema>;
export type UpdateMcqType = z.infer<typeof UpdateMcqSchema>;
export type UpdateDsaType = z.infer<typeof UpdateDsaSchema>;
export type Contest = z.infer<typeof ContestSchema>;
export type ContestType = z.infer<typeof ContestTypeEnum>;
export type ContestStatus = z.infer<typeof ContestStatusEnum>;

export type ContestResponse = {
  success: boolean;
  data: {
    contests: Contest[];
    meta: {
      totalItems: number;
      page: number;
      limit: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }
};