import { LOCAL_EXIT } from "./command";
import type { ContainerOutcome } from "./docker";
import type { Judge0StatusResponse } from "../../schema/judge0.schema";

/**
 * Container outcome → the Judge0 status vocabulary (SELF_HOSTED_JUDGE.md §4.4).
 *
 * `deriveVerdict` in `judge/parse.ts` is the only consumer, and it branches on
 * exactly five things, so this mapping only has to be right about those:
 *
 *   3  → ran to completion; `parseStdout` decides accepted / WA / RE from markers
 *   4  → wrong answer  (never produced here: our harness compares in-process)
 *   5  → time limit exceeded
 *   6  → compile error
 *   11 → runtime error
 *
 * ## Why status 6 is worth emitting even though nothing distinguishes it today
 *
 * `deriveVerdict` currently maps 6 to `runtime_error`, so a compile error is
 * shown to users as a runtime error. That is a pre-existing quirk, deliberately
 * preserved through the migration: changing it now would make Phase 5's replay
 * report divergence for every compile-error submission in history and drown the
 * real signal. Emitting the correct status here means Phase 7 fixes the display
 * by touching `parse.ts` alone.
 */
export function mapToJudge0Status(outcome: ContainerOutcome): Judge0StatusResponse {
  const { status, useStderrAsCompileOutput } = classify(outcome);

  return {
    // Judge0 returns an opaque token; the container name is this backend's
    // equivalent and is what appears in logs, so it stays greppable end to end.
    token: outcome.containerName,
    status,
    stdout: outcome.stdout || null,
    stderr: useStderrAsCompileOutput ? null : outcome.stderr || null,
    compile_output: useStderrAsCompileOutput ? outcome.stderr || null : null,
    // Judge0 reports seconds as a string; `deriveVerdict` parses it back.
    //
    // NOTE: this is wall time for the whole container, so it includes startup
    // (~150-500ms) that Judge0's figure did not. Verdicts are unaffected —
    // executionTime is displayed and stored, never compared — but expect the
    // Phase 5 replay to show uniformly larger times. Narrowing it would mean
    // instrumenting inside the container, which would pollute the marker stream.
    time: (outcome.wallMs / 1000).toFixed(3),
    // Not collected: reading a peak from cgroups requires either dropping --rm
    // (which risks leaking containers) or sampling during the run (racy). Null
    // is honest; the field is display-only. Revisit in Phase 6 if users miss it.
    memory: null,
  };
}

function classify(outcome: ContainerOutcome): {
  status: { id: number; description: string };
  useStderrAsCompileOutput: boolean;
} {
  const tle = { status: { id: 5, description: "Time Limit Exceeded" }, useStderrAsCompileOutput: false };
  const rte = { status: { id: 11, description: "Runtime Error" }, useStderrAsCompileOutput: false };

  // Checked before exit codes: when we kill the container ourselves the exit
  // code reflects OUR signal, not what the program was doing, so trusting it
  // would report a flooding program as an OOM.
  if (outcome.outputCapped) {
    return { status: { id: 5, description: "Output Limit Exceeded" }, useStderrAsCompileOutput: false };
  }

  if (outcome.killedByBackstop) {
    return tle;
  }

  switch (outcome.exitCode) {
    case 0:
      // Ran cleanly. The verdict is whatever the markers in stdout say.
      return { status: { id: 3, description: "Accepted" }, useStderrAsCompileOutput: false };

    case LOCAL_EXIT.COMPILE_FAILED:
      // Nothing ran, so stderr is compiler output rather than program output.
      return {
        status: { id: 6, description: "Compilation Error" },
        useStderrAsCompileOutput: true,
      };

    case LOCAL_EXIT.TIMEOUT:
      return tle;

    case LOCAL_EXIT.SIGKILL:
      // A `timeout` that fired exits 124 (see command.ts), so a bare SIGKILL in
      // a memory-capped container is almost always the kernel OOM-killer.
      //
      // One other path reaches here: a submission that traps SIGTERM and is
      // killed by the `-k` follow-up. That is adversarial, and both outcomes
      // are non-accepted, so the imprecision costs a clearer message and
      // nothing else. The description stays hedged for that reason.
      return {
        status: { id: 11, description: "Runtime Error (killed — out of memory or unresponsive)" },
        useStderrAsCompileOutput: false,
      };

    default:
      // Non-zero exit, fatal signal, or 126/127 from a broken image. All are
      // failures the submitter should see rather than silent retries.
      return rte;
  }
}
