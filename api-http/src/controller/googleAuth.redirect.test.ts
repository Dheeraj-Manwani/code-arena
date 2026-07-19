/**
 * `returnTo` open-redirect guard.
 *
 * `returnTo` rides in the sign-in URL, so it is attacker-controlled. If it were
 * used unchecked, a phisher could link to our real, trusted sign-in page and
 * have Google bounce the victim onto their site afterwards — with our domain in
 * the browser's history as the referrer.
 *
 * The guard is a module-private helper, so it's exercised through the exported
 * start handler: whatever survives validation is what lands in the signed state.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextFunction, Request, Response } from "express";

vi.mock("../config/env", () => ({
  env: {
    ACCESS_TOKEN_SECRET: "test-secret",
    NODE_ENV: "test",
    FRONTEND_URL: "http://localhost:5173",
    GOOGLE_CLIENT_ID: "id",
    GOOGLE_CLIENT_SECRET: "secret",
    GOOGLE_CALLBACK_URL: "http://localhost:3000/api/auth/google/callback",
  },
  isGoogleOAuthConfigured: true,
}));

// `vi.mock` is hoisted above module-level consts, so the factories must create
// their own spies; they're pulled back out via the imports below.
vi.mock("../auth/passport", () => ({
  passport: { authenticate: vi.fn(() => vi.fn()) },
}));

vi.mock("../auth/oauthStateStore", () => ({
  issueState: vi.fn(() => "nonce"),
  verifyState: vi.fn(),
  clearState: vi.fn(),
}));

vi.mock("../service/auth.service", () => ({ issueSessionFor: vi.fn() }));
vi.mock("../util/authCookies", () => ({ setRefreshCookie: vi.fn() }));
vi.mock("../lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { startGoogleAuth } from "./googleAuth.controller";
import { issueState } from "../auth/oauthStateStore";

const run = (returnTo: unknown) => {
  const req = { query: { returnTo } } as unknown as Request;
  const res = {} as Response;
  startGoogleAuth(req, res, (() => {}) as NextFunction);
  // issueState(res, returnTo) — the second arg is the validated value.
  return vi.mocked(issueState).mock.calls[0][1];
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("startGoogleAuth — returnTo validation", () => {
  it("keeps an app-relative path", () => {
    expect(run("/problems")).toBe("/problems");
  });

  it("keeps a nested path with a query string", () => {
    expect(run("/problems?difficulty=hard")).toBe("/problems?difficulty=hard");
  });

  it("drops a protocol-relative URL", () => {
    // `//evil.com` inherits our scheme and navigates off-site.
    expect(run("//evil.com")).toBeUndefined();
  });

  it("drops an absolute http(s) URL", () => {
    expect(run("https://evil.com/phish")).toBeUndefined();
  });

  it("drops a backslash-prefixed path", () => {
    // Some browsers normalise `\` to `/`, making `/\evil.com` protocol-relative.
    expect(run("/\\evil.com")).toBeUndefined();
  });

  it("drops a path containing a backslash anywhere", () => {
    expect(run("/problems\\@evil.com")).toBeUndefined();
  });

  it("drops a scheme-relative javascript: URL", () => {
    expect(run("javascript:alert(1)")).toBeUndefined();
  });

  it("drops a non-string", () => {
    expect(run(["/a", "/b"])).toBeUndefined();
    expect(run(undefined)).toBeUndefined();
  });

  it("drops an empty string", () => {
    expect(run("")).toBeUndefined();
  });
});
