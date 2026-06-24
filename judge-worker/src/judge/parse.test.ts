import { describe, it, expect } from "vitest";
import { parseStdout, deriveVerdict } from "./parse";
import type { Judge0StatusResponse } from "../schema/judge0.schema";

function status(overrides: Partial<Judge0StatusResponse>): Judge0StatusResponse {
  return {
    token: "t",
    status: { id: 3, description: "Accepted" },
    stdout: null,
    stderr: null,
    compile_output: null,
    time: null,
    memory: null,
    ...overrides,
  };
}

// The harness compares each result to the expected output and emits __PASS__ /
// __FAIL__ / __ERROR__ per case. parseStdout only tallies those markers.
describe("parseStdout", () => {
  it("returns runtime_error for empty stdout", () => {
    expect(parseStdout("", 3)).toEqual({
      testCasesPassed: 0,
      verdict: "runtime_error",
      stoppedAtCase: null,
    });
    expect(parseStdout("   \n  ", 3).verdict).toBe("runtime_error");
  });

  it("returns accepted when all cases emit __PASS__", () => {
    const stdout = [
      "__CASE__0", "__OUTPUT__[0,1]", "__PASS__",
      "__CASE__1", "__OUTPUT__[1,2]", "__PASS__",
    ].join("\n");
    expect(parseStdout(stdout, 2)).toEqual({
      testCasesPassed: 2,
      verdict: "accepted",
      stoppedAtCase: null,
    });
  });

  it("returns wrong_answer when a case emits __FAIL__", () => {
    const stdout = [
      "__CASE__0", "__OUTPUT__[0,1]", "__PASS__",
      "__CASE__1", "__OUTPUT__[9,9]", "__FAIL__",
    ].join("\n");
    const result = parseStdout(stdout, 2);
    expect(result.verdict).toBe("wrong_answer");
    expect(result.testCasesPassed).toBe(1);
    expect(result.stoppedAtCase).toBe(1);
  });

  it("returns wrong_answer when a case is missing a verdict marker", () => {
    const stdout = ["__CASE__0", "__OUTPUT__[0,1]", "__PASS__", "__CASE__1"].join("\n");
    const result = parseStdout(stdout, 2);
    expect(result.verdict).toBe("wrong_answer");
    expect(result.testCasesPassed).toBe(1);
  });

  it("stops on __ERROR__ and reports runtime_error with the failing case", () => {
    const stdout = [
      "__CASE__0", "__OUTPUT__[0,1]", "__PASS__",
      "__CASE__1", "__ERROR__boom",
    ].join("\n");
    const result = parseStdout(stdout, 3);
    expect(result.verdict).toBe("runtime_error");
    expect(result.testCasesPassed).toBe(1);
    expect(result.stoppedAtCase).toBe(1);
  });

  it("returns wrong_answer when cases run but none pass", () => {
    const stdout = ["__CASE__0", "__OUTPUT__a", "__FAIL__", "__CASE__1", "__OUTPUT__b", "__FAIL__"].join("\n");
    const result = parseStdout(stdout, 2);
    expect(result.verdict).toBe("wrong_answer");
    expect(result.testCasesPassed).toBe(0);
  });

  it("treats extra passing cases (>= total) as accepted", () => {
    const stdout = ["__CASE__0", "__OUTPUT__a", "__PASS__", "__CASE__1", "__OUTPUT__b", "__PASS__"].join("\n");
    expect(parseStdout(stdout, 1).verdict).toBe("accepted");
  });
});

describe("deriveVerdict", () => {
  it("maps status 5 to time_limit_exceeded", () => {
    expect(deriveVerdict(status({ status: { id: 5, description: "TLE" } }), 2).status).toBe(
      "time_limit_exceeded"
    );
  });

  it("maps status 6 (compilation error) to runtime_error", () => {
    expect(deriveVerdict(status({ status: { id: 6, description: "CE" } }), 2).status).toBe(
      "runtime_error"
    );
  });

  it("maps signal statuses 7..14 to runtime_error", () => {
    for (const id of [7, 8, 11, 14]) {
      expect(
        deriveVerdict(status({ status: { id, description: "sig" } }), 2).status
      ).toBe("runtime_error");
    }
  });

  it("maps status 4 to wrong_answer", () => {
    expect(deriveVerdict(status({ status: { id: 4, description: "WA" } }), 2).status).toBe(
      "wrong_answer"
    );
  });

  it("status 3 with empty stdout is runtime_error", () => {
    expect(deriveVerdict(status({ status: { id: 3, description: "OK" }, stdout: "" }), 2).status).toBe(
      "runtime_error"
    );
  });

  it("status 3 with full passing stdout is accepted", () => {
    const stdout = ["__CASE__0", "__OUTPUT__a", "__PASS__", "__CASE__1", "__OUTPUT__b", "__PASS__"].join("\n");
    const result = deriveVerdict(status({ stdout }), 2);
    expect(result.status).toBe("accepted");
    expect(result.testCasesPassed).toBe(2);
  });

  it("status 3 with a failing case is wrong_answer", () => {
    const stdout = ["__CASE__0", "__OUTPUT__a", "__PASS__", "__CASE__1", "__OUTPUT__b", "__FAIL__"].join("\n");
    const result = deriveVerdict(status({ stdout }), 2);
    expect(result.status).toBe("wrong_answer");
    expect(result.testCasesPassed).toBe(1);
  });

  it("converts Judge0 time (seconds) to milliseconds", () => {
    const result = deriveVerdict(status({ status: { id: 5, description: "TLE" }, time: "0.123" }), 1);
    expect(result.executionTime).toBe(123);
  });

  it("returns null executionTime when time is missing", () => {
    expect(deriveVerdict(status({ status: { id: 5, description: "TLE" }, time: null }), 1).executionTime).toBeNull();
  });
});
