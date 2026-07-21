import rateLimit, { ipKeyGenerator, type Options } from "express-rate-limit";
import type { Request } from "express";
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

/**
 * Practice submissions — per user, not per IP.
 *
 * Contest submits are self-limiting: you must hold a live attempt in a running
 * contest. Practice has no such gate — any user can submit to any problem, with
 * unlimited retries, forever (PRACTICE_MODE_AND_NAVIGATION.md §4.3). Each submit
 * costs a Judge0 round-trip from the same token bucket a live contest is using,
 * so an unthrottled loop here degrades contests.
 *
 * Keyed by userId so one abusive account can't consume a shared NAT's budget,
 * and so it can't be sidestepped by rotating IPs.
 */
export const practiceSubmitRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000,
  limit: 20,
  keyGenerator: (req: Request) => {
    const userId = (req as Request & { userId?: number }).userId;
    if (userId != null) {
      return `user:${userId}`;
    }
    // Falls back to IP only if this somehow runs before authenticateToken.
    // `ipKeyGenerator` masks IPv6 to its /64 — keying on the raw address would
    // let a single IPv6 user rotate addresses within their prefix to bypass the
    // limit entirely (express-rate-limit ERR_ERL_KEY_GEN_IPV6).
    return `ip:${ipKeyGenerator(req.ip ?? "")}`;
  },
});

/**
 * MCQ answering (LEARN_PATHS.md §5.7).
 *
 * Not about integrity — learn quizzes are unscored and retries are deliberate,
 * so a determined user brute-forcing four options learns nothing they couldn't
 * get by clicking. It exists so a script can't walk an entire path to 100% (or
 * hammer the endpoint) in a loop.
 *
 * Generous on purpose: a learner genuinely working through a lesson of quizzes,
 * getting some wrong and retrying, must never see a 429.
 */
export const learnAnswerRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000,
  limit: 60,
  keyGenerator: (req: Request) => {
    const userId = (req as Request & { userId?: number }).userId;
    if (userId != null) {
      return `learn-answer:user:${userId}`;
    }
    // Same IPv6 caveat as practiceSubmitRateLimiter — see above.
    return `learn-answer:ip:${ipKeyGenerator(req.ip ?? "")}`;
  },
});

/**
 * Description image uploads.
 *
 * Bounds how fast one creator account can fill the bucket — a stuck retry loop
 * in an editor is the realistic way that happens, not malice. Generous enough
 * that pasting a handful of screenshots into a problem statement in one sitting
 * never trips it.
 */
export const imageUploadRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000,
  limit: 30,
  keyGenerator: (req: Request) => {
    const userId = (req as Request & { userId?: number }).userId;
    if (userId != null) {
      return `image-upload:user:${userId}`;
    }
    return `image-upload:ip:${ipKeyGenerator(req.ip ?? "")}`;
  },
});

/**
 * Spreadsheet import (LEARN_PATHS.md §3.9).
 *
 * Much tighter than the answer limiter, because the work per request is much
 * larger: each one buffers a file, parses a workbook, and recounts an entire
 * path inside a transaction. Importing is a deliberate, occasional act — a
 * learner doing it more than a handful of times a minute is a stuck retry loop,
 * not a use case.
 */
export const learnImportRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000,
  limit: 6,
  keyGenerator: (req: Request) => {
    const userId = (req as Request & { userId?: number }).userId;
    if (userId != null) {
      return `learn-import:user:${userId}`;
    }
    return `learn-import:ip:${ipKeyGenerator(req.ip ?? "")}`;
  },
});
