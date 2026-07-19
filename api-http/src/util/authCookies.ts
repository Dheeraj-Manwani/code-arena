import type { Response } from "express";

/**
 * The refresh cookie contract, shared by password login and the Google callback
 * so both produce an identical session.
 *
 * Scoped to `/api/auth/refresh`: the browser only ever sends it to the one
 * endpoint that consumes it, so it isn't attached to every API call.
 */
const REFRESH_COOKIE_PATH = "/api/auth/refresh";

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie("refreshToken", token, {
    path: REFRESH_COOKIE_PATH,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie("refreshToken", { path: REFRESH_COOKIE_PATH });
}
