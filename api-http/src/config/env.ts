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

  // Judge0 — the judge pipeline now runs in-process, so api-http needs these
  // (Economy Service Phase 1/2). Previously they lived only in judge-worker.
  JUDGE0_API_URL: z.string().min(1, "JUDGE0_API_URL is required (Judge0 RapidAPI base URL)"),
  JUDGE0_RAPIDAPI_HOST: z.string().min(1, "JUDGE0_RAPIDAPI_HOST is required"),
  JUDGE0_RAPIDAPI_KEY: z.string().min(1, "JUDGE0_RAPIDAPI_KEY is required"),

  // Optional — sensible defaults / used only by specific features.
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().positive().default(3000), // serves REST + WebSocket (Phase 4)
  ALLOWED_HOSTS: z.string().optional(),
  RESEND_API_KEY: z.string().optional(), // required for OTP/reset emails in production
  DIRECT_URL: z.string().optional(),

  // In-process judge tuning knobs (Economy Service Phase 6).
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(4), // parallel judgings
  JUDGE_RATE_MAX: z.coerce.number().int().positive().default(10), // Judge0 calls per window
  JUDGE_RATE_WINDOW_MS: z.coerce.number().int().positive().default(1000),
  RUN_MAX_CONCURRENCY: z.coerce.number().int().positive().default(8), // concurrent /api/run
  RUN_TIMEOUT_MS: z.coerce.number().int().positive().default(35000),
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
