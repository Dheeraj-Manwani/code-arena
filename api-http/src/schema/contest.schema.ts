import { z } from "zod";
import { ContestStatus } from "@prisma/client";

export const ContestStatusEnum = z.enum(ContestStatus);

export const ContestSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  startTime: z.date(),
  endTime: z.date(),
  status: ContestStatusEnum,
  createdById: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ContestWithCreatorSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: ContestStatusEnum,
  startTime: z.date(),
  endTime: z.date(),
  createdBy: z.object({
    name: z.string(),
  }),
});

const BaseContestSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  startTime: z.union([z.iso.datetime(), z.date()], "Start time is required"),
  endTime: z.union([z.iso.datetime(), z.date()], "End time is required"),
  status: ContestStatusEnum.optional(),
});

export const CreateContestSchema = BaseContestSchema.refine(
  (data) => new Date(data.startTime) < new Date(data.endTime),
  {
    message: "startTime must be before endTime",
    path: ["endTime"],
  }
);

export const UpdateContestSchema = BaseContestSchema.partial();

export const PaginationQuerySchema = z.object({
  take: z.coerce
    .number()
    .min(1, "Take must be greater than 0")
    .max(100, "Take must be less than 100")
    .optional(),
  skip: z.coerce.number().optional(),
});

export const ContestResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: ContestStatusEnum,
  startTime: z.date(),
  endTime: z.date(),
  createdBy: z.object({
    name: z.string(),
  }),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const ContestListResponseSchema = z.object({
  contests: z.array(ContestWithCreatorSchema),
});

export const ContestDetailResponseSchema = z.object({
  contest: ContestResponseSchema,
});

export type Contest = z.infer<typeof ContestSchema>;
export type ContestWithCreator = z.infer<typeof ContestWithCreatorSchema>;
export type CreateContestInput = z.infer<typeof CreateContestSchema>;
export type UpdateContestInput = z.infer<typeof UpdateContestSchema>;
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export type ContestResponse = z.infer<typeof ContestResponseSchema>;
export type ContestListResponse = z.infer<typeof ContestListResponseSchema>;
export type ContestDetailResponse = z.infer<typeof ContestDetailResponseSchema>;
