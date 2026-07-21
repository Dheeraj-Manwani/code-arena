/**
 * Divergence detection has to be both sensitive and quiet: it must catch every
 * difference that could change a verdict, and ignore every difference that
 * cannot. A comparator that reports float-formatting noise trains everyone to
 * ignore the report, which is worse than not having one.
 */
import { describe, it, expect } from "vitest";
import { compareExecutions, shapeOf, statusClassOf } from "./compare";
import type { Judge0StatusResponse } from "../../schema/judge0.schema";

function res(over: Partial<Judge0StatusResponse> = {}): Judge0StatusResponse {
  return {
    token: "t",
    status: { id: 3, description: "Accepted" },
    stdout: null,
    stderr: null,
    compile_output: null,
    time: "0.100",
    memory: null,
    ...over,
  };
}

const twoPasses = "__CASE__0\n__OUTPUT__[0,1]\n__PASS__\n__CASE__1\n__OUTPUT__[1,2]\n__PASS__\n";

describe("shapeOf", () => {
  it("tallies markers and ignores everything else", () => {
    const shape = shapeOf(res({ stdout: twoPasses }));
    expect(shape).toMatchObject({ passed: 2, failed: 0, errored: 0, sawCase: true });
  });

  it("distinguishes no output from all-failed", () => {
    expect(shapeOf(res({ stdout: null })).sawCase).toBe(false);
    expect(shapeOf(res({ stdout: "__CASE__0\n__FAIL__\n" })).sawCase).toBe(true);
  });
});

describe("statusClassOf", () => {
  it("collapses ids that deriveVerdict treats identically", () => {
    // parse.ts maps 6 and 7-14 all to runtime_error, so reporting 6-vs-11 as a
    // verdict divergence would be noise. The raw id stays on the shape for
    // triage.
    for (const id of [7, 9, 11, 14]) {
      expect(statusClassOf(id)).toBe("runtime_error");
    }
    expect(statusClassOf(5)).toBe("time_limit");
    expect(statusClassOf(3)).toBe("ran");
  });
});

describe("compareExecutions", () => {
  it("reports no divergence for identical results", () => {
    const a = res({ stdout: twoPasses });
    expect(compareExecutions(a, a).kind).toBe("none");
  });

  /**
   * The case that motivates comparing shape instead of bytes. GCC, Node and
   * CPython serialise floats differently, so `__OUTPUT__` lines differ between
   * toolchains constantly — and `parseStdout` never reads them.
   */
  it("ignores __OUTPUT__ formatting differences", () => {
    const judge0 = res({ stdout: "__CASE__0\n__OUTPUT__[0.5,1]\n__PASS__\n" });
    const local = res({ stdout: "__CASE__0\n__OUTPUT__[0.50000,1.0]\n__PASS__\n" });
    expect(compareExecutions(judge0, local).kind).toBe("none");
  });

  it("ignores timing and memory differences", () => {
    const judge0 = res({ stdout: twoPasses, time: "0.012", memory: 3200 });
    const local = res({ stdout: twoPasses, time: "0.740", memory: null });
    expect(compareExecutions(judge0, local).kind).toBe("none");
  });

  it("catches a status class change", () => {
    const judge0 = res({ stdout: twoPasses });
    const local = res({ status: { id: 5, description: "TLE" } });
    const d = compareExecutions(judge0, local);
    expect(d.kind).toBe("status");
    expect(d.label).toBe("status:ran->time_limit");
  });

  it("catches a tally change even when both ran cleanly", () => {
    // The dangerous one: both backends exit 0, but one solved fewer cases.
    const judge0 = res({ stdout: twoPasses });
    const local = res({ stdout: "__CASE__0\n__PASS__\n__CASE__1\n__FAIL__\n" });
    const d = compareExecutions(judge0, local);
    expect(d.kind).toBe("tally");
    expect(d.label).toBe("tally:2/0/0->1/1/0");
  });

  it("does not compare tallies when neither backend ran", () => {
    // A TLE legitimately produces no markers on either side.
    const a = res({ status: { id: 5, description: "TLE" }, stdout: null });
    const b = res({ status: { id: 5, description: "TLE" }, stdout: "" });
    expect(compareExecutions(a, b).kind).toBe("none");
  });

  it("produces labels that group across submissions", () => {
    // A report of 400 divergences is only useful if they collapse to a few
    // buckets, which requires the label to carry no per-submission detail.
    const mk = (p: number, f: number) =>
      compareExecutions(
        res({ stdout: twoPasses }),
        res({ stdout: "__CASE__0\n" + "__PASS__\n".repeat(p) + "__FAIL__\n".repeat(f) })
      ).label;
    expect(mk(1, 1)).toBe(mk(1, 1));
    expect(mk(1, 1)).not.toBe(mk(0, 2));
  });
});
