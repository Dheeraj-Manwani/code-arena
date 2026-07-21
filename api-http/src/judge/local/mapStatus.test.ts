/**
 * Container outcome → verdict.
 *
 * These cases are the whole reason the local backend can be trusted: every
 * distinct way a submission can fail has to reach the user as the RIGHT
 * failure. A memory bomb reported as TLE, or a compile error reported as a
 * wrong answer, is a scoring bug that no amount of sandboxing catches.
 *
 * Pure — no Docker daemon. The behavioural counterpart is the Phase 4 corpus.
 */
import { describe, it, expect } from "vitest";
import { mapToJudge0Status } from "./mapStatus";
import { LOCAL_EXIT } from "./command";
import { deriveVerdict } from "../parse";
import type { ContainerOutcome } from "./docker";

function outcome(over: Partial<ContainerOutcome> = {}): ContainerOutcome {
  return {
    containerName: "judge-test",
    exitCode: 0,
    signal: null,
    stdout: "",
    stderr: "",
    wallMs: 250,
    killedByBackstop: false,
    outputCapped: false,
    ...over,
  };
}

/** The marker stream a passing 2-case harness produces. */
const PASSING_STDOUT = "__CASE__0\n__OUTPUT__[0,1]\n__PASS__\n__CASE__1\n__OUTPUT__[1,2]\n__PASS__\n";

describe("mapToJudge0Status", () => {
  it("maps a clean exit to 3, leaving the verdict to the markers", () => {
    const res = mapToJudge0Status(outcome({ exitCode: 0, stdout: PASSING_STDOUT }));
    expect(res.status.id).toBe(3);
    expect(res.stdout).toBe(PASSING_STDOUT);
  });

  it("maps the compile sentinel to 6 and routes stderr to compile_output", () => {
    // Nothing ran, so stderr is compiler diagnostics — surfacing it as `stderr`
    // would show a compiler message in the runtime-error panel.
    const res = mapToJudge0Status(
      outcome({ exitCode: LOCAL_EXIT.COMPILE_FAILED, stderr: "main.cpp:3:1: error: expected ';'" })
    );
    expect(res.status.id).toBe(6);
    expect(res.compile_output).toContain("expected ';'");
    expect(res.stderr).toBeNull();
  });

  it("maps the timeout exit to 5", () => {
    expect(mapToJudge0Status(outcome({ exitCode: LOCAL_EXIT.TIMEOUT })).status.id).toBe(5);
  });

  /**
   * The distinction that makes in-container `timeout` worth the complexity:
   * without it both an infinite loop and a memory bomb arrive as 137, and one
   * of the two gets the wrong verdict.
   */
  it("maps a SIGKILL that did not come from timeout to 11 (OOM), not 5", () => {
    const res = mapToJudge0Status(outcome({ exitCode: LOCAL_EXIT.SIGKILL }));
    expect(res.status.id).toBe(11);
    expect(res.status.description).toMatch(/memory/i);
  });

  it("maps a plain non-zero exit to 11", () => {
    expect(mapToJudge0Status(outcome({ exitCode: 1, stderr: "boom" })).status.id).toBe(11);
  });

  it("maps 126/127 to 11 rather than hiding a broken image", () => {
    // Exit 126 is how the Phase 2 noexec-tmpfs bug surfaced. Treating it as
    // infrastructure would have retried it silently three times per submission.
    for (const code of [126, 127]) {
      expect(mapToJudge0Status(outcome({ exitCode: code })).status.id).toBe(11);
    }
  });

  it("prefers the output cap over the exit code", () => {
    // We killed it, so the exit code describes our signal, not the program.
    const res = mapToJudge0Status(
      outcome({ outputCapped: true, exitCode: LOCAL_EXIT.SIGKILL })
    );
    expect(res.status.id).toBe(5);
  });

  it("prefers the wall backstop over the exit code", () => {
    const res = mapToJudge0Status(outcome({ killedByBackstop: true, exitCode: LOCAL_EXIT.SIGKILL }));
    expect(res.status.id).toBe(5);
  });

  it("reports time in seconds as a string, the way deriveVerdict parses it", () => {
    const res = mapToJudge0Status(outcome({ wallMs: 1234 }));
    expect(res.time).toBe("1.234");
    expect(Math.round(parseFloat(res.time!) * 1000)).toBe(1234);
  });

  it("uses the container name as the token so logs stay greppable", () => {
    expect(mapToJudge0Status(outcome({ containerName: "judge-abc" })).token).toBe("judge-abc");
  });
});

/**
 * The mapping only matters insofar as `deriveVerdict` reads it — these pin the
 * two modules together so a change to either surfaces here.
 */
describe("mapToJudge0Status → deriveVerdict", () => {
  it("produces `accepted` when every marker passed", () => {
    const res = mapToJudge0Status(outcome({ stdout: PASSING_STDOUT }));
    expect(deriveVerdict(res, 2)).toMatchObject({ status: "accepted", testCasesPassed: 2 });
  });

  it("produces `wrong_answer` with a partial tally", () => {
    const stdout = "__CASE__0\n__PASS__\n__CASE__1\n__FAIL__\n";
    const res = mapToJudge0Status(outcome({ stdout }));
    expect(deriveVerdict(res, 2)).toMatchObject({ status: "wrong_answer", testCasesPassed: 1 });
  });

  it("produces `time_limit_exceeded` for a timed-out run", () => {
    const res = mapToJudge0Status(outcome({ exitCode: LOCAL_EXIT.TIMEOUT }));
    expect(deriveVerdict(res, 2).status).toBe("time_limit_exceeded");
  });

  it("produces `runtime_error` for an OOM kill", () => {
    const res = mapToJudge0Status(outcome({ exitCode: LOCAL_EXIT.SIGKILL }));
    expect(deriveVerdict(res, 2).status).toBe("runtime_error");
  });

  /**
   * Documents a known quirk rather than endorsing it: `deriveVerdict` collapses
   * status 6 into `runtime_error`, so users see "Runtime Error" for code that
   * never compiled. Preserved deliberately through the migration — fixing it now
   * would make the Phase 5 replay report divergence for every compile error in
   * history. Phase 7 changes this expectation to `compile_error`.
   */
  it("currently reports a compile error as runtime_error (fixed in Phase 7)", () => {
    const res = mapToJudge0Status(outcome({ exitCode: LOCAL_EXIT.COMPILE_FAILED, stderr: "err" }));
    expect(deriveVerdict(res, 2).status).toBe("runtime_error");
  });
});
