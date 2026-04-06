import { z } from "zod";
import { RoleEnum, SessionUserSchema } from "./user.schema";

const EmailSchema = z
  .string()
  .min(1, { message: "Email is required" })
  .email({ message: "Please enter a valid email address" })
  .toLowerCase()
  .trim()
  .max(255, { message: "Email must not exceed 255 characters" });

const PasswordSchema = z
  .string()
  .min(1, { message: "Password is required" })
  .min(6, { message: "Password must be at least 6 characters" })
  .max(100, { message: "Password must not exceed 100 characters" });

export const SignUpSchema = z
  .object({
    name: z
      .string()
      .min(1, { message: "Name is required" })
      .min(2, { message: "Name must be at least 2 characters" })
      .max(100, { message: "Name must not exceed 100 characters" })
      .regex(/^[a-zA-Z\s'-]+$/, {
        message:
          "Name can only contain letters, spaces, hyphens, and apostrophes",
      }),
    email: EmailSchema,
    password: PasswordSchema,
    confirmPassword: z
      .string()
      .min(1, { message: "Please confirm your password" }),
    role: RoleEnum.optional().default("contestee"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const VerifyOtpSchema = z.object({
  email: EmailSchema,
  otp: z
    .string()
    .min(1, { message: "OTP is required" })
    .length(6, { message: "OTP must be exactly 6 digits" })
    .regex(/^\d+$/, { message: "OTP must contain only numbers" }),
});

export const LoginSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});

export const ForgotPasswordSchema = z
  .object({
    email: EmailSchema,
    newPassword: PasswordSchema,
    confirmPassword: PasswordSchema,
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const ResetPasswordSchema = z.object({
  email: EmailSchema,
  otp: z
    .string()
    .min(1, { message: "OTP is required" })
    .length(6, { message: "OTP must be exactly 6 digits" })
    .regex(/^\d+$/, { message: "OTP must contain only numbers" }),
  newPassword: PasswordSchema,
});

export const AuthResponseSchema = z.object({
  user: SessionUserSchema,
  accessToken: z.string(),
});

export type SignUpInput = Omit<z.infer<typeof SignUpSchema>, "confirmPassword">;
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
