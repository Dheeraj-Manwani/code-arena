/**
 * Startup environment validation (fail-fast) for the realtime-gateway.
 *
 * Lightweight manual validation — this service intentionally has no zod dependency.
 * Imported at the top of src/index.ts so the gateway refuses to boot without the
 * secret it needs to verify WebSocket auth tokens.
 */
import "dotenv/config";

interface GatewayEnv {
  ACCESS_TOKEN_SECRET: string;
  NODE_ENV: string;
  WS_PORT: number;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD: string | undefined;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    console.error(`\n[realtime-gateway] Missing required environment variable: ${name}\n`);
    process.exit(1);
  }
  return value;
}

function intWithDefault(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    console.error(`\n[realtime-gateway] Invalid ${name}: expected a positive integer, got "${raw}"\n`);
    process.exit(1);
  }
  return parsed;
}

export const env: GatewayEnv = {
  ACCESS_TOKEN_SECRET: required("ACCESS_TOKEN_SECRET"),
  NODE_ENV: process.env.NODE_ENV ?? "development",
  WS_PORT: intWithDefault("WS_PORT", 8080),
  REDIS_HOST: process.env.REDIS_HOST ?? "localhost",
  REDIS_PORT: intWithDefault("REDIS_PORT", 6379),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
};
