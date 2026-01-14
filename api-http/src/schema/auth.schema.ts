import { z } from "zod";

export const SignUpSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  password: z.string().min(1),
  role: z.enum(["creator", "contestee"]).optional().default("contestee"),
});

export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export type SignUpSchemaType = z.infer<typeof SignUpSchema>;
export type LoginSchemaType = z.infer<typeof LoginSchema>;
