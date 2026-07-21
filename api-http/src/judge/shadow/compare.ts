import { JUDGE_OUTPUT_MARKERS } from "../../util/boilerplate/judgeBoilerplate";
import type { Judge0StatusResponse } from "../../schema/judge0.schema";

/**
 * Comparing two backends' results (SELF_HOSTED_JUDGE.md Phase 5).
 *
 * ## Why this compares a "shape" rather than the raw responses
 *
 * Byte-comparing stdout would report divergence constantly and mean nothing.
 * The harness emits an `__OUTPUT__` line per test case holding the serialised
 * return value, and GCC 9 vs Node 12 vs Python 3.8 format floats differently —
 * `parseStdout` ignores those lines entirely, so they cannot change a verdict.
 *
 * What CAN change a verdict is exactly two things: the status class, and the
 * tally of PASS/FAIL/ERROR markers. `deriveVerdict` is a pure function of
 * (statusId, stdout, totalTestCases), so if two responses agree on the status
 * class and the marker tallies, they produce the same verdict for ANY
 * totalTestCases — which is what lets shadow mode compare without knowing it.
 */

export type StatusClass =
  | "ran" // 3 — the markers decide; compare tallies
  | "wrong_answer" // 4 — Judge0 only; our harness never produces it
  | "time_limit" // 5
  | "compile_error" // 6
  | "runtime_error"; // 7-14

export interface ExecutionShape {
  readonly statusId: number;
  readonly statusClass: StatusClass;
  readonly passed: number;
  readonly failed: number;
  readonly errored: number;
  /** Whether any `__CASE__` marker appeared — distinguishes "no output" from "all failed". */
  readonly sawCase: boolean;
}

export type DivergenceKind = "none" | "status" | "tally";

export interface Divergence {
  readonly kind: DivergenceKind;
  /** Stable, groupable label for the report — not a sentence. */
  readonly label: string;
  readonly reference: ExecutionShape;
  readonly candidate: ExecutionShape;
}

/**
 * Mirrors the branching in `deriveVerdict` (`judge/parse.ts`).
 *
 * Deliberately collapses ids that `deriveVerdict` treats identically — 6 and
 * 7-14 all become `runtime_error` there — so a compile error reported against a
 * crash is not counted as a verdict divergence. The raw `statusId` is kept on
 * the shape so triage can still see the difference.
 */
export function statusClassOf(statusId: number): StatusClass {
  if (statusId === 5) return "time_limit";
  if (statusId === 6) return "compile_error";
  if (statusId === 4) return "wrong_answer";
  if (statusId >= 7 && statusId <= 14) return "runtime_error";
  return "ran";
}

export function shapeOf(res: Judge0StatusResponse): ExecutionShape {
  const { CASE, PASS, FAIL, ERROR } = JUDGE_OUTPUT_MARKERS;
  const stdout = res.stdout ?? "";

  let passed = 0;
  let failed = 0;
  let errored = 0;
  let sawCase = false;

  for (const line of stdout.split("\n")) {
    if (line.startsWith(CASE)) sawCase = true;
    else if (line.startsWith(PASS)) passed++;
    else if (line.startsWith(FAIL)) failed++;
    else if (line.startsWith(ERROR)) errored++;
  }

  return {
    statusId: res.status.id,
    statusClass: statusClassOf(res.status.id),
    passed,
    failed,
    errored,
    sawCase,
  };
}

/**
 * `reference` is the authoritative backend (Judge0 during the migration);
 * `candidate` is the one being validated.
 *
 * The `label` is built to be grouped on: a report of 400 divergences is only
 * useful if they collapse into a handful of causes.
 */
export function compareExecutions(
  reference: Judge0StatusResponse,
  candidate: Judge0StatusResponse
): Divergence {
  const ref = shapeOf(reference);
  const cand = shapeOf(candidate);

  if (ref.statusClass !== cand.statusClass) {
    return {
      kind: "status",
      label: `status:${ref.statusClass}->${cand.statusClass}`,
      reference: ref,
      candidate: cand,
    };
  }

  // Tallies only carry meaning when the program actually ran; a TLE or compile
  // error legitimately produces no markers on either side.
  if (ref.statusClass === "ran") {
    if (ref.passed !== cand.passed || ref.failed !== cand.failed || ref.errored !== cand.errored) {
      return {
        kind: "tally",
        label: `tally:${ref.passed}/${ref.failed}/${ref.errored}->${cand.passed}/${cand.failed}/${cand.errored}`,
        reference: ref,
        candidate: cand,
      };
    }
  }

  return { kind: "none", label: "none", reference: ref, candidate: cand };
}
