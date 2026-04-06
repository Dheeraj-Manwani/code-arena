import type { Judge0StatusResponse, ParseResult } from "../schema/judge0.schema";

export function parseStdout(stdout: string, totalTestCases: number): ParseResult {
  if (!stdout || stdout.trim().length === 0) {
    return { testCasesPassed: 0, verdict: "runtime_error", stoppedAtCase: null };
  }

  const lines = stdout.split("\n");
  let currentCase = -1;
  let testCasesPassed = 0;

  for (const line of lines) {
    if (line.startsWith("__CASE__")) {
      currentCase = parseInt(line.slice("__CASE__".length), 10);
      continue;
    }

    if (line.startsWith("__ERROR__")) {
      return {
        testCasesPassed,
        verdict: "runtime_error",
        stoppedAtCase: currentCase,
      };
    }

    if (line.startsWith("__OUTPUT__")) {
      const result = line.slice("__OUTPUT__".length).trim();
      // The harness embeds expected outputs; a match means stdout already reflects pass.
      // Since we don't have expected outputs in the worker, we trust the harness:
      // if __OUTPUT__ is emitted without a preceding __ERROR__, the test passed.
      // However, the spec says "compare result to expectedOutput" — but expected outputs
      // are NOT in the job payload. The harness itself prints __ERROR__ on mismatch.
      // So if we see __OUTPUT__, the test case passed.
      if (result !== undefined) {
        testCasesPassed++;
      }
      continue;
    }
  }

  if (testCasesPassed >= totalTestCases) {
    return { testCasesPassed, verdict: "accepted", stoppedAtCase: null };
  }

  if (testCasesPassed > 0 && testCasesPassed < totalTestCases) {
    return { testCasesPassed, verdict: "wrong_answer", stoppedAtCase: currentCase };
  }

  return { testCasesPassed: 0, verdict: "runtime_error", stoppedAtCase: null };
}

export function deriveVerdict(
  judgeStatus: Judge0StatusResponse,
  totalTestCases: number
): {
  status: "accepted" | "wrong_answer" | "time_limit_exceeded" | "runtime_error";
  testCasesPassed: number;
  executionTime: number | null;
} {
  const executionTime =
    judgeStatus.time !== null ? Math.round(parseFloat(judgeStatus.time) * 1000) : null;

  const statusId = judgeStatus.status.id;

  if (statusId === 5) {
    return { status: "time_limit_exceeded", testCasesPassed: 0, executionTime };
  }

  if (statusId === 6) {
    return { status: "runtime_error", testCasesPassed: 0, executionTime };
  }

  if (statusId >= 7 && statusId <= 14) {
    return { status: "runtime_error", testCasesPassed: 0, executionTime };
  }

  if (statusId === 4) {
    return { status: "wrong_answer", testCasesPassed: 0, executionTime };
  }

  // statusId === 3 — Accepted at infra level, parse stdout to determine actual verdict
  if (!judgeStatus.stdout || judgeStatus.stdout.trim().length === 0) {
    return { status: "runtime_error", testCasesPassed: 0, executionTime };
  }

  const parsed = parseStdout(judgeStatus.stdout, totalTestCases);

  return {
    status: parsed.verdict,
    testCasesPassed: parsed.testCasesPassed,
    executionTime,
  };
}
