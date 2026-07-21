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

  // Judge0 — required unless JUDGE_BACKEND=local (enforced by the superRefine
  // below; shadow mode still runs Judge0 as the authoritative backend). A
  // deployment on the local container backend must not be forced to hold a
  // RapidAPI key it never uses.
  JUDGE0_API_URL: z.string().min(1).optional(),
  JUDGE0_RAPIDAPI_HOST: z.string().min(1).optional(),
  JUDGE0_RAPIDAPI_KEY: z.string().min(1).optional(),

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

  // Cloudflare R2, for images embedded in problem descriptions.
  //
  // Optional as a group, exactly like Google OAuth below: unset means image
  // upload is off and /api/uploads/image returns 501, so a fresh clone and CI
  // still boot and run without storage credentials.
  // `isImageUploadConfigured` is the single check for "is it on".
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  /** Public base URL of the bucket — an r2.dev address or a custom domain. */
  R2_PUBLIC_URL: z.string().optional(),

  // Which execution backend runs submissions (SELF_HOSTED_JUDGE.md).
  //   judge0 — RapidAPI (needs the JUDGE0_* vars)
  //   local  — container per submission (needs Docker + judge images)
  //   shadow — judge0 authoritative, local run alongside and compared
  // Rejecting an unimplemented value at boot beats discovering it when the
  // first submission of a contest fails to judge.
  JUDGE_BACKEND: z.enum(["judge0", "local", "shadow"]).default("judge0"),

  // Shadow-mode caps (Phase 5). Small on purpose — see jobs/constants.ts.
  SHADOW_MAX_CONCURRENCY: z.coerce.number().int().positive().default(2),
  SHADOW_MAX_QUEUED: z.coerce.number().int().positive().default(32),

  // Local backend tuning (SELF_HOSTED_JUDGE.md Phase 3). Defaults in
  // jobs/constants.ts; these only validate that overrides are sane.
  LOCAL_COMPILE_TIMEOUT_S: z.coerce.number().int().positive().default(10),
  LOCAL_RUN_TIMEOUT_S: z.coerce.number().int().positive().default(5),
  LOCAL_WALL_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  LOCAL_OUTPUT_CAP_BYTES: z.coerce.number().int().positive().default(1048576),

  // In-process judge tuning knobs (Economy Service Phase 6).
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(4), // parallel judgings
  JUDGE_RATE_MAX: z.coerce.number().int().positive().default(10), // Judge0 calls per window
  JUDGE_RATE_WINDOW_MS: z.coerce.number().int().positive().default(1000),
  RUN_MAX_CONCURRENCY: z.coerce.number().int().positive().default(8), // concurrent /api/run
  RUN_TIMEOUT_MS: z.coerce.number().int().positive().default(35000),
})
  /**
   * Judge0 credentials are required only by the Judge0 backend.
   *
   * Checked here rather than as field-level `.min(1)` so the requirement can
   * depend on JUDGE_BACKEND. Without this, switching to the local backend would
   * still demand a RapidAPI key — the exact coupling this migration removes.
   */
  .superRefine((cfg, ctx) => {
    // Shadow mode runs Judge0 as the authoritative backend, so it needs the
    // credentials just as much as plain `judge0` does.
    if (cfg.JUDGE_BACKEND === "local") return;

    for (const key of ["JUDGE0_API_URL", "JUDGE0_RAPIDAPI_HOST", "JUDGE0_RAPIDAPI_KEY"] as const) {
      if (!cfg[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required when JUDGE_BACKEND=${cfg.JUDGE_BACKEND}`,
        });
      }
    }
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

/**
 * Image upload is on only when the whole R2 group is present.
 *
 * Partial config is a deployment mistake rather than a valid state — a bucket
 * name with no credentials would fail at the first upload with an opaque SDK
 * error, so it is surfaced at boot instead.
 */
export const isImageUploadConfigured = Boolean(
  env.R2_ACCOUNT_ID &&
    env.R2_ACCESS_KEY_ID &&
    env.R2_SECRET_ACCESS_KEY &&
    env.R2_BUCKET &&
    env.R2_PUBLIC_URL,
);

const r2VarsSet = [
  env.R2_ACCOUNT_ID,
  env.R2_ACCESS_KEY_ID,
  env.R2_SECRET_ACCESS_KEY,
  env.R2_BUCKET,
  env.R2_PUBLIC_URL,
].filter(Boolean).length;

if (r2VarsSet > 0 && r2VarsSet < 5) {
  // eslint-disable-next-line no-console
  console.error(
    "\n[api-http] Invalid environment configuration:\n" +
      "  - Cloudflare R2 is partially configured. Set all of R2_ACCOUNT_ID,\n" +
      "    R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET and R2_PUBLIC_URL,\n" +
      "    or none of them.\n",
  );
  process.exit(1);
}

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
