import { describe, it, expect } from "vitest";
import { JudgeApiError, BackendApiError, PollTimeoutError, isTransientError } from "./index";

describe("error classification (issues.md §7.5)", () => {
  it("treats Judge0 429 / 503 / 500 as transient", () => {
    for (const code of [429, 500, 502, 503, 504, 408]) {
      expect(new JudgeApiError(code, {}).isTransient).toBe(true);
      expect(isTransientError(new JudgeApiError(code, {}))).toBe(true);
    }
  });

  it("treats Judge0 4xx user/config errors as terminal", () => {
    for (const code of [400, 401, 403, 404, 422]) {
      expect(new JudgeApiError(code, {}).isTransient).toBe(false);
      expect(isTransientError(new JudgeApiError(code, {}))).toBe(false);
    }
  });

  it("treats backend 5xx as transient, 4xx as terminal", () => {
    expect(isTransientError(new BackendApiError(503, "/x"))).toBe(true);
    expect(isTransientError(new BackendApiError(400, "/x"))).toBe(false);
  });

  it("treats poll timeouts as transient", () => {
    expect(isTransientError(new PollTimeoutError("tok"))).toBe(true);
  });

  it("treats network errors (ECONNRESET/ETIMEDOUT) as transient", () => {
    expect(isTransientError({ code: "ECONNRESET" })).toBe(true);
    expect(isTransientError({ code: "ETIMEDOUT" })).toBe(true);
  });

  it("treats unknown/plain errors as terminal", () => {
    expect(isTransientError(new Error("boom"))).toBe(false);
    expect(isTransientError("nope")).toBe(false);
  });
});
