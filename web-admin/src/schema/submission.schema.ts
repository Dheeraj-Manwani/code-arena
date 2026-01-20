import { z } from "zod";

export const SubmitMcqSchema = z.object({
  selectedOptionIndex: z.number().int().min(0),
});

export const SubmitDsaSchema = z.object({
  code: z.string().min(1),
  language: z.string().min(1),
});

export type SubmitMcqSchemaType = z.infer<typeof SubmitMcqSchema>;
export type SubmitDsaSchemaType = z.infer<typeof SubmitDsaSchema>;
