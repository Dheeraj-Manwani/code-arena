import rateLimit, { type Options } from "express-rate-limit";
import { sendError } from "../util/response";
import { ApiErrorCode } from "../schema/error.schema";

/**
 * Shared rate-limit handler so throttled responses use the standard
 * { success, data, error } envelope (HTTP 429) instead of express-rate-limit's
 * default plaintext body.
 */
const rateLimitHandler: Options["handler"] = (_req, res) => {
  sendError(res, ApiErrorCode.TOO_MANY_REQUESTS, 429);
};

const baseOptions: Partial<Options> = {
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
};

/**
 * Credential endpoints (login/signup) — brute-force / email-amplification surface.
 * Issues.md §3.7.
 */
export const authRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20,
});

/**
 * OTP verification / password-reset endpoints — per-IP throttle that complements
 * the per-OTP failed-attempt lockout. Issues.md §3.5.
 */
export const otpRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 15,
});

/**
 * Code execution — each call is a Judge0 round-trip. Issues.md §3.7.
 */
export const runRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000, // 1 minute
  limit: 10,
});
