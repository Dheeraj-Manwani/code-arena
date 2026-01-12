import rateLimit from "express-rate-limit";

/**
 * Global protection against floods & bots
 * Applies to ALL requests
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * OTP SEND (register + login)
 * Prevents email bombing & enumeration
 */
export const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 OTPs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many OTP requests. Please try again later.",
  },
});

/**
 * OTP VERIFY
 * Prevents brute-force attacks
 */
export const otpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // max 10 attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many OTP attempts. Please try again later.",
  },
});

/**
 * REFRESH TOKEN
 * Allows frequent refresh without abuse
 */
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many refresh attempts. Please slow down.",
  },
});

/**
 * LOGOUT
 * Low-risk endpoint, light protection
 */
export const logoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
