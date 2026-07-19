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

  // Google OAuth. Optional as a group: unset means the feature is simply off and
  // /api/auth/google returns 501 — deployments that don't use Google sign-in must
  // still boot. `isGoogleOAuthConfigured` below is the single check for "is it on".
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  /** Must match the redirect URI registered in the Google Cloud console exactly. */
  GOOGLE_CALLBACK_URL: z.string().optional(),
  /** Where the callback sends the browser once the refresh cookie is set. */
  FRONTEND_URL: z.string().default("http://localhost:5173"),

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

/**
 * Google sign-in is on only when the whole trio is present.
 *
 * A partial config is a deployment mistake, not a valid state — half-configured
 * OAuth would fail at the redirect with an opaque Google error, so surface it at
 * boot instead.
 */
export const isGoogleOAuthConfigured = Boolean(
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_CALLBACK_URL,
);

const googleVarsSet = [
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_CALLBACK_URL,
].filter(Boolean).length;

if (googleVarsSet > 0 && googleVarsSet < 3) {
  // eslint-disable-next-line no-console
  console.error(
    "\n[api-http] Invalid environment configuration:\n" +
      "  - Google OAuth is partially configured. Set all of GOOGLE_CLIENT_ID,\n" +
      "    GOOGLE_CLIENT_SECRET and GOOGLE_CALLBACK_URL, or none of them.\n",
  );
  process.exit(1);
}
