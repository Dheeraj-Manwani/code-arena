import crypto from "crypto";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";
import { env } from "../config/env";

/**
 * Stateless OAuth 2.0 `state` store (CSRF protection for the Google handshake).
 *
 * The `state` parameter exists to bind the callback to the browser that started
 * the flow. Without it, an attacker can feed a victim a callback URL carrying
 * the attacker's authorization code and silently log the victim into the
 * attacker's account — "login CSRF".
 *
 * passport-oauth2's built-in store keeps state in `req.session`, which would
 * mean adding express-session. This process is deliberately session-free and
 * single-instance (see ECONOMY_SERVICE.md): the default MemoryStore leaks and is
 * documented as unfit for production, and any real store means new infra we
 * removed on purpose.
 *
 * So: the nonce travels as `state`, and its only counterpart lives in a signed,
 * short-lived, httpOnly cookie. A forged callback can't produce a cookie for the
 * victim's browser, so verification fails. Nothing is stored server-side, and a
 * restart mid-login costs nothing beyond a retry.
 */
const STATE_COOKIE = "g_oauth_state";
const STATE_TTL_SECONDS = 10 * 60;

interface StateClaims {
  nonce: string;
  /** Path to send the user back to after login. */
  returnTo?: string;
}

const cookieOptions = {
  httpOnly: true,
  // `lax` (not `strict`) is required: the callback is a cross-site top-level
  // navigation from accounts.google.com, and a strict cookie would not be sent.
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  maxAge: STATE_TTL_SECONDS * 1000,
  path: "/api/auth",
};

export function issueState(res: Response, returnTo?: string): string {
  const nonce = crypto.randomBytes(16).toString("hex");

  const token = jwt.sign({ nonce, returnTo } satisfies StateClaims, env.ACCESS_TOKEN_SECRET, {
    expiresIn: STATE_TTL_SECONDS,
  });

  res.cookie(STATE_COOKIE, token, cookieOptions);
  return nonce;
}

export interface VerifiedState {
  returnTo?: string;
}

/**
 * Check the nonce Google echoed back against the one in this browser's cookie.
 * Returns null when they don't match, the cookie is missing, or it has expired.
 */
export function verifyState(req: Request, providedNonce?: string): VerifiedState | null {
  const token: unknown = req.cookies?.[STATE_COOKIE];

  if (typeof token !== "string" || !providedNonce) {
    return null;
  }

  let claims: StateClaims;
  try {
    claims = jwt.verify(token, env.ACCESS_TOKEN_SECRET) as StateClaims;
  } catch {
    return null;
  }

  // Constant-time compare so the nonce can't be recovered by timing the response.
  const expected = Buffer.from(claims.nonce);
  const actual = Buffer.from(providedNonce);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    return null;
  }

  return { returnTo: claims.returnTo };
}

/** Single-use: the state must not survive its callback. */
export function clearState(res: Response): void {
  res.clearCookie(STATE_COOKIE, { path: cookieOptions.path });
}
