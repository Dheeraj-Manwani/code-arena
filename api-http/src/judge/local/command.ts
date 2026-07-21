import { LANGUAGE_SPECS } from "./languages";
import type { JudgeLanguage } from "../../schema/job.schema";

/**
 * Builds the `docker run` invocation for a sandboxed execution
 * (SELF_HOSTED_JUDGE.md Phase 2).
 *
 * Pure and dependency-free so the sandbox flags can be asserted in a unit test
 * without a Docker daemon. Phase 3's `docker.ts` spawns what this produces;
 * Phase 4 hardens the limits against the adversarial corpus.
 */

/**
 * Sentinel exit code meaning "the compile step failed".
 *
 * Needed because a compiler and a crashing program can both exit 1, and
 * `deriveVerdict` has to tell them apart (compile → status 6, crash → 11).
 * When this code comes back, nothing has run yet, so whatever is on stderr is
 * compile output.
 */
export const COMPILE_FAILED_EXIT = 101;

/**
 * Exit codes the container can report, and what each one means.
 *
 * These are deliberately non-overlapping so a verdict never has to be guessed:
 *  - GNU `timeout` exits 124 when it fires, even with `-s KILL`, so a timeout is
 *    distinguishable from the 137 (128+SIGKILL) that the kernel OOM-killer
 *    produces. Without `timeout` both would arrive as 137 and a memory bomb
 *    would be indistinguishable from an infinite loop.
 *  - 126/127 ("cannot execute" / "not found") are NOT infrastructure errors —
 *    they are how a broken image surfaces, e.g. the noexec-tmpfs bug in Phase 2.
 *    They map to a runtime error so the submission fails visibly.
 *  - 125 is the one code docker reserves for itself (daemon unreachable, bad
 *    flag), which is why it is treated as infrastructure, not user code.
 */
export const LOCAL_EXIT = {
  /** Compile step failed or timed out — stderr holds the compiler output. */
  COMPILE_FAILED: COMPILE_FAILED_EXIT,
  /** GNU timeout fired on the run step. */
  TIMEOUT: 124,
  /** `docker run` itself failed; the container never started. */
  DOCKER_FAILURE: 125,
  /** Killed by SIGKILL that did not come from `timeout` — i.e. the OOM-killer. */
  SIGKILL: 137,
} as const;

export interface SandboxLimits {
  /** Container memory cap. Also used for --memory-swap. */
  readonly memory: string;
  /** Max processes/threads — the fork-bomb control. */
  readonly pids: number;
  /** CPU share. */
  readonly cpus: string;
  /** Size of the writable /tmp tmpfs. */
  readonly tmpfsSize: string;
}

/**
 * Java needs a larger ceiling than the rest: the JVM reserves a big virtual
 * address space at startup, so a cap that is generous for a C++ program will
 * OOM-kill a correct Java solution before it runs a test case. Phase 4 pins
 * these against the adversarial corpus.
 */
export const DEFAULT_LIMITS: SandboxLimits = {
  memory: "256m",
  pids: 64,
  cpus: "1",
  tmpfsSize: "64m",
};

export const JAVA_LIMITS: SandboxLimits = {
  ...DEFAULT_LIMITS,
  memory: "512m",
};

export function limitsFor(language: JudgeLanguage): SandboxLimits {
  return language === "java" ? JAVA_LIMITS : DEFAULT_LIMITS;
}

/**
 * Guards the invariant that makes `sh -c` safe here: every token interpolated
 * into the command string comes from LANGUAGE_SPECS, never from user input.
 * User source code reaches the container as a FILE.
 *
 * This exists so a future edit to languages.ts cannot quietly turn the command
 * builder into an injection point — the failure would otherwise be silent and
 * only reachable with a crafted submission.
 */
export function assertShellSafe(argv: readonly string[]): void {
  for (const token of argv) {
    if (!/^[A-Za-z0-9_./:+=-]+$/.test(token)) {
      throw new Error(
        `Unsafe token in LANGUAGE_SPECS: ${JSON.stringify(token)}. ` +
          `Tokens are interpolated into a shell command and must stay metacharacter-free.`
      );
    }
  }
}

/**
 * Seconds between the catchable SIGTERM and the uncatchable SIGKILL that
 * follows it. Long enough that a normal process finishes dying; short enough
 * that a submission trapping SIGTERM cannot buy meaningful extra runtime.
 */
export const KILL_GRACE_SECONDS = 1;

export interface StepTimeouts {
  /** Seconds allowed for the compile step. Compilers are legitimately slow. */
  readonly compileSeconds: number;
  /** Seconds allowed for the run step. User code is not. */
  readonly runSeconds: number;
}

/**
 * Compile and run must share ONE container: the compile step writes into /tmp,
 * a per-container tmpfs that does not survive to a second `docker run`. Hence
 * a single `sh -c` rather than two invocations.
 *
 * Each step gets its own in-container `timeout`, which is what makes the two
 * failures distinguishable. A compile that hangs (template bomb) trips the
 * compile timeout, whose non-zero status is swallowed by `|| exit 101` and
 * reported as a compile error; a program that loops trips the run timeout and
 * surfaces as 124. One outer limit covering both could not tell them apart.
 *
 * ## Why `-k 1 -s TERM` and not the obvious `-s KILL`
 *
 * Measured, not assumed. `timeout -s KILL` **always** exits 137, never 124 —
 * SIGKILL takes the child down before timeout can report a clean timeout, and
 * `--foreground` does not change this. 137 is also what the kernel OOM-killer
 * produces, so `-s KILL` makes an infinite loop and a memory bomb
 * indistinguishable, and every TLE gets reported as a runtime error.
 *
 * `-s TERM` exits 124 when the timeout fires and leaves 137 to mean OOM, which
 * is the distinction we need. SIGTERM is catchable, so `-k 1` follows up with
 * an uncatchable SIGKILL one second later.
 *
 * Residual case: a submission that traps SIGTERM survives to the `-k` kill and
 * comes back as 137, so it is reported as a runtime error rather than TLE. Both
 * are non-accepted, so there is no scoring exploit — only a less precise
 * message for a deliberately hostile submission.
 *
 * `exec` on the run step so the user's process replaces the shell as PID 1.
 * Without it `sh` stays PID 1, and a signal delivered to the container reaps
 * the shell while the real process is orphaned inside it.
 */
export function buildShellCommand(language: JudgeLanguage, timeouts: StepTimeouts): string {
  const spec = LANGUAGE_SPECS[language];
  const guard = (seconds: number) => [
    "timeout",
    "-k", String(KILL_GRACE_SECONDS), // uncatchable follow-up
    "-s", "TERM",                     // catchable, but exits a clean 124
    String(seconds),
  ];

  assertShellSafe(spec.run);
  const runCmd = [...guard(timeouts.runSeconds), ...spec.run].join(" ");

  if (!spec.compile) {
    return `exec ${runCmd}`;
  }

  assertShellSafe(spec.compile);
  const compileCmd = [...guard(timeouts.compileSeconds), ...spec.compile].join(" ");

  return `${compileCmd} || exit ${COMPILE_FAILED_EXIT}; exec ${runCmd}`;
}

/**
 * `workspace` is passed as its own argv element, so the OS — not a shell —
 * handles it. A path containing spaces cannot split into two arguments.
 */
export interface DockerRunOptions {
  readonly limits?: SandboxLimits;
  readonly timeouts: StepTimeouts;
  /**
   * Required to kill the container on the Node-side backstop. Killing the
   * `docker run` client process does NOT stop the container it started — the
   * daemon owns its lifetime — so a timeout has to `docker kill` it by name.
   */
  readonly containerName: string;
}

export function buildDockerArgs(
  language: JudgeLanguage,
  workspace: string,
  opts: DockerRunOptions
): string[] {
  const spec = LANGUAGE_SPECS[language];
  const limits = opts.limits ?? limitsFor(language);

  return [
    "run",
    "--rm",
    "--name", opts.containerName,
    "--network", "none",                 // no egress, no DNS
    "--memory", limits.memory,
    "--memory-swap", limits.memory,      // equal to --memory, else swap defeats the cap
    "--pids-limit", String(limits.pids), // fork bombs
    "--cpus", limits.cpus,
    "--read-only",                       // / is immutable; only the tmpfs is writable
    // `exec` is required, not incidental: Docker mounts --tmpfs noexec by
    // default, which makes a compiled C++ binary in /tmp die with exit 126
    // ("Permission denied") while interpreted languages pass. Java also passes
    // without it, because .class files are read by the JVM rather than exec'd —
    // so the failure reproduces in exactly one of four languages.
    //
    // Dropping noexec costs little: isolation here comes from the namespace,
    // cgroup, and capability limits, and the entire purpose of this sandbox is
    // to execute a program the user supplied. noexec cannot constrain someone
    // who is already running arbitrary compiled code.
    "--tmpfs", `/tmp:rw,exec,size=${limits.tmpfsSize},mode=1777`,
    "--cap-drop", "ALL",
    "--security-opt", "no-new-privileges",
    "-v", `${workspace}:/work:ro`,
    "-w", "/work",
    spec.image,
    "sh", "-c", buildShellCommand(language, opts.timeouts),
  ];
}
