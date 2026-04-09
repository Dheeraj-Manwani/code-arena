import type { TestCaseResult } from "@/schema/problem.schema";

const CASE_MARKER = "__CASE__";
const OUTPUT_MARKER = "__OUTPUT__";
const ERROR_MARKER = "__ERROR__";

function normalizeOutput(s: string): string {
  const t = s.trim();
  try {
    return JSON.stringify(JSON.parse(t));
  } catch {
    return t;
  }
}

interface ParsedHarnessLine {
  index: number;
  kind: "out" | "err";
  value: string;
}

function parseHarnessStdout(stdout: string): ParsedHarnessLine[] {
  const lines = stdout.split("\n");
  const parsed: ParsedHarnessLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trimStart() ?? "";
    if (!line.startsWith(CASE_MARKER)) {
      continue;
    }

    const idx = Number.parseInt(line.slice(CASE_MARKER.length), 10);
    if (Number.isNaN(idx)) {
      continue;
    }

    const nextLine = lines[i + 1]?.trimStart() ?? "";
    if (nextLine.startsWith(OUTPUT_MARKER)) {
      parsed.push({
        index: idx,
        kind: "out",
        value: nextLine.slice(OUTPUT_MARKER.length).trim(),
      });
      i += 1;
      continue;
    }

    if (nextLine.startsWith(ERROR_MARKER)) {
      parsed.push({
        index: idx,
        kind: "err",
        value: nextLine.slice(ERROR_MARKER.length).trim(),
      });
      i += 1;
    }
  }

  return parsed;
}

export function formatHarnessStdoutForDisplay(
  stdout: string | null | undefined
): string {
  if (!stdout?.trim()) {
    return "-";
  }

  const parsed = parseHarnessStdout(stdout);
  if (parsed.length === 0) {
    return stdout.trim();
  }

  return parsed
    .map((entry) => {
      const label = entry.kind === "err" ? "Error" : "Output";
      return `Case ${entry.index + 1} ${label}: ${entry.value || "-"}`;
    })
    .join("\n");
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

  const outputs = new Map<number, { kind: "out" | "err"; value: string }>();
  for (const entry of parseHarnessStdout(stdout)) {
    outputs.set(entry.index, { kind: entry.kind, value: entry.value });
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
