import type { NextFunction, Request, Response } from "express";
import type { User } from "@prisma/client";
import { passport } from "../auth/passport";
import { clearState, issueState, verifyState } from "../auth/oauthStateStore";
import { env, isGoogleOAuthConfigured } from "../config/env";
import { issueSessionFor } from "../service/auth.service";
import { setRefreshCookie } from "../util/authCookies";
import { OAuthNotConfiguredError } from "../errors/auth.errors";
import { AppError } from "../errors/app-error";
import { logger } from "../lib/logger";

/**
 * Only ever redirect to a path inside our own frontend.
 *
 * `returnTo` is attacker-controllable (it rides in the start URL), so an
 * unchecked value turns this endpoint into an open redirect — a phisher could
 * link to our real, trusted sign-in and have Google bounce the victim to their
 * page afterwards.
 *
 * Rejects anything that isn't a single-slash-rooted path: `//evil.com` is
 * protocol-relative and `https://evil.com` is absolute; both would leave the site.
 */
function safeReturnTo(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }
  if (!value.startsWith("/") || value.startsWith("//")) {
    return undefined;
  }
  // Backslashes are normalised to `/` by some browsers, so `/\evil.com` can
  // escape too.
  if (value.includes("\\")) {
    return undefined;
  }
  return value;
}

const frontend = (path: string) => `${env.FRONTEND_URL.replace(/\/$/, "")}${path}`;

/** Send the browser back to the SPA with a machine-readable failure reason. */
function redirectWithError(res: Response, code: string): void {
  clearState(res);
  res.redirect(frontend(`/login?error=${encodeURIComponent(code)}`));
}

/** GET /api/auth/google — kick off the handshake. */
export const startGoogleAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!isGoogleOAuthConfigured) {
    throw new OAuthNotConfiguredError();
  }

  // Nonce goes to Google as `state`; its counterpart is set as a signed cookie.
  const state = issueState(res, safeReturnTo(req.query.returnTo));

  return passport.authenticate("google", {
    session: false,
    scope: ["profile", "email"],
    state,
  })(req, res, next);
};

/** GET /api/auth/google/callback — Google redirects the browser here. */
export const googleCallback = (req: Request, res: Response, next: NextFunction) => {
  if (!isGoogleOAuthConfigured) {
    throw new OAuthNotConfiguredError();
  }

  // The user declined consent (or Google refused). Not an error worth a 500.
  if (typeof req.query.error === "string") {
    logger.info({ reason: req.query.error }, "Google sign-in cancelled by user");
    return redirectWithError(res, "OAUTH_CANCELLED");
  }

  // CSRF gate: verify Google's echoed state against this browser's cookie before
  // exchanging the code for anything.
  const verified = verifyState(req, typeof req.query.state === "string" ? req.query.state : undefined);
  if (!verified) {
    logger.warn("Rejected Google callback: state mismatch or expired");
    return redirectWithError(res, "OAUTH_STATE_INVALID");
  }

  return passport.authenticate(
    "google",
    { session: false },
    async (err: unknown, user: User | false) => {
      if (err) {
        // A rejected identity (e.g. unverified Google email) carries its own
        // code; anything else is genuinely unexpected.
        const code = err instanceof AppError ? err.code : "OAUTH_FAILED";
        logger.warn(
          { err: err instanceof Error ? err.message : String(err) },
          "Google sign-in failed",
        );
        return redirectWithError(res, code);
      }

      if (!user) {
        return redirectWithError(res, "OAUTH_FAILED");
      }

      try {
        const { refreshToken } = issueSessionFor(user);

        clearState(res);
        setRefreshCookie(res, refreshToken);

        // The access token is NOT put in the URL: query strings leak through
        // browser history, Referer headers, and server logs. The SPA calls
        // /api/auth/refresh on boot and mints one from this httpOnly cookie —
        // the same path a returning user already takes.
        return res.redirect(frontend(verified.returnTo ?? "/"));
      } catch (issueErr) {
        return next(issueErr);
      }
    },
  )(req, res, next);
};
