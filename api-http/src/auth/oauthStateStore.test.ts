/**
 * OAuth `state` (login-CSRF protection).
 *
 * Without a verified state parameter an attacker can hand a victim a callback
 * URL carrying the attacker's authorization code, silently logging the victim
 * into the attacker's account. These tests pin the rejection cases — the ones
 * that matter are the mismatched and missing-cookie paths.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

vi.mock("../config/env", () => ({
  env: { ACCESS_TOKEN_SECRET: "test-secret-for-state", NODE_ENV: "test" },
}));

import { issueState, verifyState, clearState } from "./oauthStateStore";

type CookieOptions = Record<string, unknown>;

const makeRes = () => {
  const cookies: Record<string, string> = {};
  const setOptions: CookieOptions[] = [];

  const res = {
    cookie: vi.fn((name: string, value: string, options?: CookieOptions) => {
      cookies[name] = value;
      if (options) setOptions.push(options);
    }),
    clearCookie: vi.fn(),
  } as unknown as Response;

  return { res, cookies, setOptions };
};

const makeReq = (cookies: Record<string, string>) => ({ cookies }) as unknown as Request;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("issueState", () => {
  it("sets an httpOnly cookie and returns the nonce", () => {
    const { res, cookies, setOptions } = makeRes();

    const nonce = issueState(res);

    expect(nonce).toMatch(/^[a-f0-9]{32}$/);
    expect(cookies.g_oauth_state).toBeTruthy();
    // The nonce must not be readable by scripts on the page.
    expect(setOptions[0]).toMatchObject({ httpOnly: true });
  });

  it("uses sameSite=lax so the cookie survives the redirect back from Google", () => {
    const { res, setOptions } = makeRes();
    issueState(res);

    // `strict` would drop the cookie on the cross-site top-level navigation from
    // accounts.google.com, breaking every sign-in.
    expect(setOptions[0]).toMatchObject({ sameSite: "lax" });
  });

  it("issues a distinct nonce each time", () => {
    const a = issueState(makeRes().res);
    const b = issueState(makeRes().res);
    expect(a).not.toBe(b);
  });
});

describe("verifyState", () => {
  it("accepts the nonce it issued for this browser", () => {
    const { res, cookies } = makeRes();
    const nonce = issueState(res, "/problems");

    expect(verifyState(makeReq(cookies), nonce)).toEqual({ returnTo: "/problems" });
  });

  it("rejects a nonce that doesn't match the cookie (forged callback)", () => {
    const { res, cookies } = makeRes();
    issueState(res);

    expect(verifyState(makeReq(cookies), "deadbeef".repeat(4))).toBeNull();
  });

  it("rejects when the browser has no state cookie at all", () => {
    const { res } = makeRes();
    const nonce = issueState(res);

    // An attacker can make the victim's browser hit the callback, but cannot
    // plant a cookie in it.
    expect(verifyState(makeReq({}), nonce)).toBeNull();
  });

  it("rejects when Google echoed no state back", () => {
    const { res, cookies } = makeRes();
    issueState(res);

    expect(verifyState(makeReq(cookies), undefined)).toBeNull();
  });

  it("rejects a cookie not signed with our secret", () => {
    expect(verifyState(makeReq({ g_oauth_state: "not.a.jwt" }), "abc")).toBeNull();
  });

  it("carries no returnTo when none was requested", () => {
    const { res, cookies } = makeRes();
    const nonce = issueState(res);

    expect(verifyState(makeReq(cookies), nonce)).toEqual({ returnTo: undefined });
  });
});

describe("clearState", () => {
  it("clears the cookie on the path it was set for", () => {
    const { res } = makeRes();
    clearState(res);

    expect(res.clearCookie).toHaveBeenCalledWith("g_oauth_state", { path: "/api/auth" });
  });
});
