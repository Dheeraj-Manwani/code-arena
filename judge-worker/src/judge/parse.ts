import type { Judge0StatusResponse, ParseResult } from "../schema/judge0.schema";

export function parseStdout(stdout: string, totalTestCases: number): ParseResult {
  if (!stdout || stdout.trim().length === 0) {
    return { testCasesPassed: 0, verdict: "runtime_error", stoppedAtCase: null };
  }

  const lines = stdout.split("\n");
  let currentCase = -1;
  let testCasesPassed = 0;
  let sawCase = false;
  let firstFailCase: number | null = null;

  // The harness compares each result to the expected output and emits one of
  // __PASS__ / __FAIL__ / __ERROR__ per case. The worker only tallies markers.
  for (const line of lines) {
    if (line.startsWith("__CASE__")) {
      currentCase = parseInt(line.slice("__CASE__".length), 10);
      sawCase = true;
      continue;
    }

    if (line.startsWith("__ERROR__")) {
      // A thrown exception in user code — terminal for this run.
      return {
        testCasesPassed,
        verdict: "runtime_error",
        stoppedAtCase: currentCase,
      };
    }

    if (line.startsWith("__PASS__")) {
      testCasesPassed++;
      continue;
    }

    if (line.startsWith("__FAIL__")) {
      if (firstFailCase === null) firstFailCase = currentCase;
      continue;
    }
  }

  if (testCasesPassed >= totalTestCases && totalTestCases > 0) {
    return { testCasesPassed, verdict: "accepted", stoppedAtCase: null };
  }

  // Some cases ran (we saw __CASE__/__PASS__/__FAIL__) but not all passed → wrong answer.
  if (sawCase) {
    return { testCasesPassed, verdict: "wrong_answer", stoppedAtCase: firstFailCase };
  }

  // No markers at all — the program produced no usable output (e.g. crashed before run).
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
