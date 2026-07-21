import { z } from "zod";

/** Mirrors the Prisma enums so request validation doesn't depend on the client. */
export const LearnPathStatusEnum = z.enum(["draft", "published", "archived"]);
export type LearnPathStatus = z.infer<typeof LearnPathStatusEnum>;

export const LearnQuestionKindEnum = z.enum(["problem", "mcq"]);
export type LearnQuestionKind = z.infer<typeof LearnQuestionKindEnum>;

const slug = z
  .string()
  .min(1, { message: "Slug is required" })
  .max(80, { message: "Slug must not exceed 80 characters" })
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "Slug must be lowercase letters, numbers and single hyphens",
  });

const title = z
  .string()
  .min(1, { message: "Title is required" })
  .max(200, { message: "Title must not exceed 200 characters" });

/**
 * `0` disables soft gating for the whole path (§5.4), so the lower bound is 0
 * rather than something like 0.1 — "no gating" must be expressible without a
 * code change.
 */
const unlockThreshold = z
  .number()
  .min(0, { message: "Threshold cannot be negative" })
  .max(1, { message: "Threshold is a fraction between 0 and 1" });

export const CreateLearnPathSchema = z.object({
  slug,
  title,
  description: z
    .string()
    .min(1, { message: "Description is required" })
    .max(1000, { message: "Description must not exceed 1000 characters" }),
  unlockThreshold: unlockThreshold.optional(),
  isFeatured: z.boolean().optional(),
});
export type CreateLearnPathInput = z.infer<typeof CreateLearnPathSchema>;

export const UpdateLearnPathSchema = z
  .object({
    title: title.optional(),
    description: z.string().min(1).max(1000).optional(),
    status: LearnPathStatusEnum.optional(),
    unlockThreshold: unlockThreshold.optional(),
    isFeatured: z.boolean().optional(),
    order: z.number().int().min(0).optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "At least one field must be provided for update",
  });
export type UpdateLearnPathInput = z.infer<typeof UpdateLearnPathSchema>;

export const CreateLearnModuleSchema = z.object({
  slug,
  title,
  summary: z.string().max(500).nullable().optional(),
});
export type CreateLearnModuleInput = z.infer<typeof CreateLearnModuleSchema>;

export const UpdateLearnModuleSchema = z
  .object({
    title: title.optional(),
    summary: z.string().max(500).nullable().optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "At least one field must be provided for update",
  });
export type UpdateLearnModuleInput = z.infer<typeof UpdateLearnModuleSchema>;

/** Lesson prose. Generous cap — this is a teaching page, not a form field. */
const lessonBody = z
  .string()
  .max(50_000, { message: "Lesson body must not exceed 50,000 characters" })
  .nullable()
  .optional();

export const CreateLearnLessonSchema = z.object({
  slug,
  title,
  body: lessonBody,
});
export type CreateLearnLessonInput = z.infer<typeof CreateLearnLessonSchema>;

export const UpdateLearnLessonSchema = z
  .object({
    title: title.optional(),
    body: lessonBody,
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "At least one field must be provided for update",
  });
export type UpdateLearnLessonInput = z.infer<typeof UpdateLearnLessonSchema>;

/**
 * Attaching a question. A discriminated union rather than two optional ids, so
 * the compiler and the validator both enforce what the database's CHECK
 * constraint enforces — one target, matching `kind`.
 */
export const AttachLearnQuestionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("problem"),
    problemId: z.number().int().positive(),
    note: z.string().max(500).nullable().optional(),
  }),
  z.object({
    kind: z.literal("mcq"),
    mcqId: z.number().int().positive(),
    note: z.string().max(500).nullable().optional(),
  }),
]);
export type AttachLearnQuestionInput = z.infer<typeof AttachLearnQuestionSchema>;

export const UpdateLearnQuestionSchema = z.object({
  note: z.string().max(500).nullable(),
});
export type UpdateLearnQuestionInput = z.infer<typeof UpdateLearnQuestionSchema>;

/**
 * A reorder request.
 *
 * `targetIndex` is a position, not an order value — the client says "put it
 * third", the server decides what number that is (§5.9). Sending an order value
 * instead would put the sparse-ordering arithmetic in the browser, where two
 * curators could compute the same one.
 */
export const ReorderSchema = z.object({
  targetIndex: z.number().int().min(0),
});
export type ReorderInput = z.infer<typeof ReorderSchema>;

/** Answering an MCQ. Only the index — grading is entirely server-side. */
export const AnswerMcqSchema = z.object({
  selectedOptionIndex: z.number().int().min(0),
});
export type AnswerMcqInput = z.infer<typeof AnswerMcqSchema>;
