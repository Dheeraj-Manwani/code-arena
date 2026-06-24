/**
 * Startup environment validation (fail-fast).
 *
 * Import this module FIRST in src/index.ts so the process refuses to boot with a
 * missing/invalid configuration instead of failing deep inside a request handler.
 * Pure modules (used by unit tests) must NOT import this file.
 */
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  // Required — the app cannot function without these.
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required (Prisma/PostgreSQL connection string)"),
  ACCESS_TOKEN_SECRET: z.string().min(1, "ACCESS_TOKEN_SECRET is required (JWT signing key)"),
  REFRESH_TOKEN_SECRET: z.string().min(1, "REFRESH_TOKEN_SECRET is required (JWT signing key)"),
  BACKEND_INTERNAL_SECRET: z
    .string()
    .min(1, "BACKEND_INTERNAL_SECRET is required (shared secret for judge-worker callbacks)"),

  // Optional — sensible defaults / used only by specific features.
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  ALLOWED_HOSTS: z.string().optional(),
  RESEND_API_KEY: z.string().optional(), // required for OTP/reset emails in production
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  DIRECT_URL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
  // eslint-disable-next-line no-console
  console.error(`\n[api-http] Invalid environment configuration:\n${details}\n`);
  process.exit(1);
}

export const env: Env = parsed.data;
