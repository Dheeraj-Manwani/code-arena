import { email, z } from "zod";
import { Role } from "@prisma/client";

const RoleEnum = z.enum(Role);

export const EmailSchema = z
  .string()
  .trim()
  .min(1, { message: "Email is required" })
  .pipe(z.email({ message: "Invalid email" }));

export const SessionUserSchema = z.object({
  id: z.string(),
  email: EmailSchema,
  role: RoleEnum,
});

export type SessionUser = z.infer<typeof SessionUserSchema>;

export const RegisterUserSchema = z.object({
  email: EmailSchema,
});

export type RegisterUserInput = z.infer<typeof RegisterUserSchema>;

export const VerifyUserSchema = z.object({
  email: EmailSchema,
  otp: z
    .string()
    .min(1, { message: "OTP is required" })
    .max(6, { message: "OTP must be 6 digits" }),
});

export type VerifyUserInput = z.infer<typeof VerifyUserSchema>;

export const LoginUserSchema = z.object({
  email: EmailSchema,
  password: z.string().optional(),
});

export type LoginUserInput = z.infer<typeof LoginUserSchema>;
