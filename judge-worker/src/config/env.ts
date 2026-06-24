/**
 * Startup environment validation (fail-fast) for the judge-worker.
 *
 * Imported at the top of src/index.ts so the worker refuses to boot with a
 * missing/invalid configuration instead of failing on the first job.
 * Pure modules (used by unit tests) must NOT import this file.
 */
import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  // Required — the submit/run pipeline cannot reach Judge0 or api-http without these.
  JUDGE0_API_URL: z.string().min(1, "JUDGE0_API_URL is required (Judge0 RapidAPI base URL)"),
  JUDGE0_RAPIDAPI_HOST: z.string().min(1, "JUDGE0_RAPIDAPI_HOST is required"),
  JUDGE0_RAPIDAPI_KEY: z.string().min(1, "JUDGE0_RAPIDAPI_KEY is required"),
  BACKEND_API_URL: z.string().min(1, "BACKEND_API_URL is required (api-http base URL)"),
  BACKEND_INTERNAL_SECRET: z
    .string()
    .min(1, "BACKEND_INTERNAL_SECRET is required (shared secret with api-http)"),

  // Optional — sensible defaults.
  NODE_ENV: z.string().default("development"),
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(4),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
  console.error(`\n[judge-worker] Invalid environment configuration:\n${details}\n`);
  process.exit(1);
}

export const env: Env = parsed.data;
