import { z } from "zod";

export const RoleEnum = z.enum(["creator", "contestee"]);

export const SessionUserSchema = z.object({
  id: z.number().int(),
  email: z.email(),
  name: z.string(),
  role: RoleEnum,
  isVerified: z.boolean().default(false),
});

export type SessionUser = z.infer<typeof SessionUserSchema>;
