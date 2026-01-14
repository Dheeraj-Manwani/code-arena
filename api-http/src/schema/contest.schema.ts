import { z } from "zod";

export const CreateContestSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  startTime: z.iso.datetime(),
  endTime: z.iso.datetime(),
});

export const AddMcqSchema = z
  .object({
    questionText: z.string().min(1),
    options: z.array(z.string()).min(2),
    correctOptionIndex: z.number().int().min(0),
    points: z.number().int().min(1).default(1),
  })
  .refine((data) => data.correctOptionIndex < data.options.length, {
    message: "Invalid correctOptionIndex",
    path: ["correctOptionIndex"],
  });

export const AddDsaSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  tags: z.array(z.string()),
  points: z.number().int().min(1).default(100),
  timeLimit: z.number().int().min(1).default(2000),
  memoryLimit: z.number().int().min(1).default(256),
  testCases: z
    .array(
      z.object({
        input: z.string(),
        expectedOutput: z.string(),
        isHidden: z.boolean().default(false),
      })
    )
    .min(1),
});

export type CreateContestSchemaType = z.infer<typeof CreateContestSchema>;
export type AddMcqSchemaType = z.infer<typeof AddMcqSchema>;
export type AddDsaSchemaType = z.infer<typeof AddDsaSchema>;
