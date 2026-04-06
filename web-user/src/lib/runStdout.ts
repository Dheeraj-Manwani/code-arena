import type { TestCaseResult } from "@/schema/problem.schema";

function normalizeOutput(s: string): string {
  const t = s.trim();
  try {
    return JSON.stringify(JSON.parse(t));
  } catch {
    return t;
  }
}

/**
 * Parse judge harness stdout (__CASE__ / __OUTPUT__ / __ERROR__) into per-test results.
 * Compares __OUTPUT__ payload to expectedOutput when present (harness may print output even on WA).
 */
export function harnessStdoutToTestResults(
  stdout: string | null | undefined,
  testCases: { id: number; expectedOutput: string }[]
): TestCaseResult[] {
  if (!stdout?.trim()) {
    return testCases.map((tc) => ({
      id: tc.id,
      passed: false,
      actualOutput: "(no stdout)",
    }));
  }

  const lines = stdout.split("\n");
  const outputs = new Map<number, { kind: "out" | "err"; value: string }>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith("__CASE__")) continue;
    const idx = parseInt(line.slice("__CASE__".length), 10);
    if (Number.isNaN(idx)) continue;
    const next = lines[i + 1];
    if (!next) continue;
    if (next.startsWith("__OUTPUT__")) {
      outputs.set(idx, {
        kind: "out",
        value: next.slice("__OUTPUT__".length).trim(),
      });
    } else if (next.startsWith("__ERROR__")) {
      outputs.set(idx, {
        kind: "err",
        value: next.slice("__ERROR__".length).trim(),
      });
    }
    i++;
  }

  return testCases.map((tc, index) => {
    const cell = outputs.get(index);
    if (!cell) {
      return { id: tc.id, passed: false, actualOutput: "(not run)" };
    }
    if (cell.kind === "err") {
      return { id: tc.id, passed: false, actualOutput: cell.value };
    }
    const passed =
      normalizeOutput(cell.value) === normalizeOutput(tc.expectedOutput);
    return { id: tc.id, passed, actualOutput: cell.value };
  });
}
