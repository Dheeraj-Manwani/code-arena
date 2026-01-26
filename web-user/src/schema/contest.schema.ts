import { z } from "zod";
import { DsaProblemSchema, McqQuestionSchema } from "./problem.schema";

export const ContestTypeEnum = z.enum(["practice", "competitive"]);
export const ContestStatusEnum = z.enum([
  "draft",
  "published",
  "cancelled",
]);
export const ContestPhaseEnum = z.enum([
  "upcoming",
  "running",
  "ended",
]);

export const CreateContestSchema = z
  .object({
    title: z
      .string()
      .min(1, { message: "Title is required" })
      .max(200, { message: "Title must not exceed 200 characters" }),
    description: z
      .string()
      .min(1, { message: "Description is required" })
      .max(5000, { message: "Description must not exceed 5000 characters" }),
    startTime: z.iso.datetime().optional(),
    endTime: z.iso.datetime().optional(),
    type: ContestTypeEnum.optional().default("practice"),
    status: ContestStatusEnum.optional().default("draft"),
    maxDurationMs: z
      .number()
      .int()
      .min(60 * 1_000, { message: "Max duration must be at least 1 minute" })
      .optional(),
    questions: z
      .array(
        z.object({
          type: z.enum(["mcq", "dsa"]),
          id: z.number().int().positive(),
          order: z.number().int().nonnegative(),
        }),
      )
      .optional()
      .default([]),
  })
  .superRefine((data, ctx) => {
    const now = new Date();
    const isPractice = data.type === "practice";
    const isCompetitive = data.type === "competitive";

    // Practice contests: maxDurationMs is required and must be at least 1 minute
    if (isPractice) {
      if (!data.maxDurationMs) {
        ctx.addIssue({
          code: "custom",
          message: "Max duration is required for practice contests",
          path: ["maxDurationMs"],
        });
      } else if (data.maxDurationMs < 60 * 1_000) {
        ctx.addIssue({
          code: "custom",
          message: "Max duration must be at least 1 minute",
          path: ["maxDurationMs"],
        });
      }
    }

    // Competitive contests: startTime and endTime are required, maxDurationMs is not needed
    if (isCompetitive) {
      if (!data.startTime) {
        ctx.addIssue({
          code: "custom",
          message: "Start time is required for competitive contests",
          path: ["startTime"],
        });
      }
      if (!data.endTime) {
        ctx.addIssue({
          code: "custom",
          message: "End time is required for competitive contests",
          path: ["endTime"],
        });
      }
    }

    if (data.startTime) {
      const startDate = new Date(data.startTime);
      if (startDate < now) {
        ctx.addIssue({
          code: "custom",
          message: "Start time cannot be in the past",
          path: ["startTime"],
        });
      }
    }

    if (data.endTime) {
      const endDate = new Date(data.endTime);
      if (endDate < now) {
        ctx.addIssue({
          code: "custom",
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
          code: "custom",
          message: "End time must be greater than or equal to start time",
          path: ["endTime"],
        });
      }
    }
  });

export const UpdateContestSchema = z
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
    startTime: z.iso.datetime().optional().nullable(),
    endTime: z.iso.datetime().optional().nullable(),
    type: ContestTypeEnum.optional(),
    status: ContestStatusEnum.optional(),
    maxDurationMs: z
      .number()
      .int()
      .min(60 * 1_000, { message: "Max duration must be at least 1 minute" })
      .optional()
      .nullable(),
    questions: z
      .array(
        z.object({
          type: z.enum(["mcq", "dsa"]),
          id: z.number().int().positive(),
          order: z.number().int().nonnegative(),
        }),
      )
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

    const now = new Date();
    const isPractice = data.type === "practice";
    const isCompetitive = data.type === "competitive";

    // Practice contests: maxDurationMs is required and must be at least 1 minute
    if (isPractice) {
      if (data.maxDurationMs === undefined || data.maxDurationMs === null) {
        ctx.addIssue({
          code: "custom",
          message: "Max duration is required for practice contests",
          path: ["maxDurationMs"],
        });
      } else if (data.maxDurationMs < 60 * 1_000) {
        ctx.addIssue({
          code: "custom",
          message: "Max duration must be at least 1 minute",
          path: ["maxDurationMs"],
        });
      }
      // For practice contests, startTime and endTime should be null
      if (data.startTime !== undefined && data.startTime !== null) {
        ctx.addIssue({
          code: "custom",
          message: "Start time is not needed for practice contests",
          path: ["startTime"],
        });
      }
      if (data.endTime !== undefined && data.endTime !== null) {
        ctx.addIssue({
          code: "custom",
          message: "End time is not needed for practice contests",
          path: ["endTime"],
        });
      }
    }

    // Competitive contests: startTime and endTime are required, maxDurationMs is not needed
    if (isCompetitive) {
      if (data.startTime === undefined || data.startTime === null) {
        ctx.addIssue({
          code: "custom",
          message: "Start time is required for competitive contests",
          path: ["startTime"],
        });
      }
      if (data.endTime === undefined || data.endTime === null) {
        ctx.addIssue({
          code: "custom",
          message: "End time is required for competitive contests",
          path: ["endTime"],
        });
      }
      // For competitive contests, maxDurationMs should be null
      if (data.maxDurationMs !== undefined && data.maxDurationMs !== null) {
        ctx.addIssue({
          code: "custom",
          message: "Max duration is not needed for competitive contests",
          path: ["maxDurationMs"],
        });
      }
    }

    if (data.startTime && typeof data.startTime === "string") {
      const startDate = new Date(data.startTime);
      if (startDate < now) {
        ctx.addIssue({
          code: "custom",
          message: "Start time cannot be in the past",
          path: ["startTime"],
        });
      }
    }

    if (data.endTime && typeof data.endTime === "string") {
      const endDate = new Date(data.endTime);
      if (endDate < now) {
        ctx.addIssue({
          code: "custom",
          message: "End time cannot be in the past",
          path: ["endTime"],
        });
      }
    }

    if (
      data.startTime &&
      data.endTime &&
      typeof data.startTime === "string" &&
      typeof data.endTime === "string"
    ) {
      const startDate = new Date(data.startTime);
      const endDate = new Date(data.endTime);

      if (endDate < startDate) {
        ctx.addIssue({
          code: "custom",
          message: "End time must be greater than or equal to start time",
          path: ["endTime"],
        });
      }
    }

    // If maxDurationMs is provided (and not null), it must be at least 1 minute
    if (
      data.maxDurationMs !== undefined &&
      data.maxDurationMs !== null &&
      data.maxDurationMs < 60 * 1_000
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Max duration must be at least 1 minute",
        path: ["maxDurationMs"],
      });
    }
  });

// Contest schema matching the API response from getAllContests
export const ContestSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  startTime: z.iso.datetime().nullable(),
  endTime: z.iso.datetime().nullable(),
  maxDurationMs: z.number().nullable(),
  type: ContestTypeEnum,
  status: ContestStatusEnum,
  phase: ContestPhaseEnum.optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  creatorId: z.number(),
  mcqCount: z.number(),
  dsaCount: z.number(),
});

export const ContestWithQuestionsSchema = ContestSchema.extend({
  questions: z.array(z.object({
    id: z.number(),
    order: z.number(),
    type: z.enum(["mcq", "dsa"]),
    mcq: McqQuestionSchema.optional(),
    dsa: DsaProblemSchema.optional(),
  }).optional()),
});

export type ContestWithQuestions = z.infer<typeof ContestWithQuestionsSchema>;

// Export types
export type CreateContestInput = z.infer<typeof CreateContestSchema>;
export type UpdateContestInput = z.infer<typeof UpdateContestSchema>;

export type Contest = z.infer<typeof ContestSchema>;
export type ContestType = z.infer<typeof ContestTypeEnum>;
export type ContestStatus = z.infer<typeof ContestStatusEnum>;
export type ContestPhase = z.infer<typeof ContestPhaseEnum>;

export const ContestMetaSchema = z.object({
  totalItems: z.number(),
  page: z.number(),
  limit: z.number(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export const ContestListResponseSchema = z.object({
  contests: z.array(ContestSchema),
  meta: ContestMetaSchema,
});

export type ContestListResponse = z.infer<typeof ContestListResponseSchema>;
export type ContestMeta = z.infer<typeof ContestMetaSchema>;

export type ContestResponse = {
  success: boolean;
  data: ContestListResponse;
};

export type ContestWithDates = Omit<
  Contest,
  "startTime" | "endTime" | "createdAt" | "updatedAt"
> & {
  startTime: Date | null;
  endTime: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export const GetContestsSchema = z.object({
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
    .pipe(z.number().int().min(1))
    .default(10),

  search: z
    .string()
    .optional()
    .transform((v) => v?.trim() || undefined),

  status: ContestStatusEnum.optional(),

  sortBy: z
    .string()
    .optional()
    .transform((v) => v?.trim() || undefined),

  type: ContestTypeEnum.optional(),
});
