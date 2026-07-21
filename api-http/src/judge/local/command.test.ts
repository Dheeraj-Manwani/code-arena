/**
 * The sandbox flags are the entire security boundary for untrusted code
 * (SELF_HOSTED_JUDGE.md §8). Dropping one is a silent regression: submissions
 * keep judging correctly, and nothing fails until someone exploits the gap.
 *
 * These assertions are deliberately literal — they pin the flags themselves,
 * not a paraphrase of them. Pure functions, no Docker daemon required; the
 * behavioural counterpart is the Phase 4 adversarial corpus.
 */
import { describe, it, expect } from "vitest";
import {
  buildDockerArgs,
  buildShellCommand,
  assertShellSafe,
  limitsFor,
  COMPILE_FAILED_EXIT,
  DEFAULT_LIMITS,
  KILL_GRACE_SECONDS,
} from "./command";
import { LANGUAGE_SPECS, JUDGE_LANGUAGES } from "./languages";
import type { JudgeLanguage } from "../../schema/job.schema";

const TIMEOUTS = { compileSeconds: 10, runSeconds: 5 };
const OPTS = { timeouts: TIMEOUTS, containerName: "judge-test" };

/** Reads the value following a flag in the argv array. */
function valueOf(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

describe("buildDockerArgs — sandbox flags", () => {
  for (const lang of JUDGE_LANGUAGES) {
    describe(lang, () => {
      const args = buildDockerArgs(lang, "/w", OPTS);

      it("disables networking", () => {
        expect(valueOf(args, "--network")).toBe("none");
      });

      it("caps pids so a fork bomb cannot exhaust the host", () => {
        expect(Number(valueOf(args, "--pids-limit"))).toBeGreaterThan(0);
      });

      it("pins --memory-swap to --memory so swap cannot defeat the cap", () => {
        expect(valueOf(args, "--memory-swap")).toBe(valueOf(args, "--memory"));
      });

      it("drops all capabilities and forbids privilege escalation", () => {
        expect(valueOf(args, "--cap-drop")).toBe("ALL");
        expect(valueOf(args, "--security-opt")).toBe("no-new-privileges");
      });

      it("mounts the workspace read-only on a read-only rootfs", () => {
        expect(args).toContain("--read-only");
        expect(valueOf(args, "-v")).toBe("/w:/work:ro");
      });

      it("removes the container so runs cannot accumulate", () => {
        expect(args).toContain("--rm");
      });

      /**
       * Regression guard for a bug that reproduced in exactly one language:
       * Docker's --tmpfs defaults to noexec, so a compiled C++ binary exits 126
       * while python/js/java all pass. Anyone tightening this mount needs to
       * know that C++ is the only test that will catch it.
       */
      it("mounts /tmp exec, or compiled binaries cannot run", () => {
        const tmpfs = valueOf(args, "--tmpfs") ?? "";
        expect(tmpfs).toMatch(/^\/tmp:/);
        expect(tmpfs).toContain("exec");
        expect(tmpfs).toContain("mode=1777");
      });
    });
  }

  it("passes the workspace as one argv element, so spaces cannot split it", () => {
    const args = buildDockerArgs("python", "C:\\Users\\a b\\ws", OPTS);
    expect(args).toContain("C:\\Users\\a b\\ws:/work:ro");
  });

  /**
   * Killing the `docker run` client does NOT stop the container — the daemon
   * owns its lifetime. Without a name there is no way to reach it, and a
   * runaway submission keeps burning CPU after we have given up on it.
   */
  it("names the container so a timeout can kill it", () => {
    const args = buildDockerArgs("python", "/w", OPTS);
    expect(valueOf(args, "--name")).toBe("judge-test");
  });

  it("gives Java a larger ceiling than the others", () => {
    // The JVM reserves a large virtual address space at startup; a cap that is
    // generous for C++ OOM-kills a correct Java solution before it runs.
    expect(limitsFor("java").memory).not.toBe(DEFAULT_LIMITS.memory);
    expect(limitsFor("cpp").memory).toBe(DEFAULT_LIMITS.memory);
  });
});

describe("buildShellCommand", () => {
  it("exits with the compile sentinel so a compile error is distinguishable", () => {
    // Both a failing compiler and a crashing program exit 1; deriveVerdict must
    // map the first to status 6 and the second to 11.
    const cmd = buildShellCommand("cpp", TIMEOUTS);
    expect(cmd).toContain(`|| exit ${COMPILE_FAILED_EXIT}`);
    expect(cmd).toContain("g++");
  });

  it("skips the compile step for interpreted languages", () => {
    for (const lang of ["python", "javascript"] as JudgeLanguage[]) {
      const cmd = buildShellCommand(lang, TIMEOUTS);
      expect(cmd).not.toContain(String(COMPILE_FAILED_EXIT));
      expect(cmd.startsWith("exec ")).toBe(true);
    }
  });

  it("execs the final process so signals reach it rather than the shell", () => {
    // Without exec, `sh` stays PID 1 and a SIGKILL on timeout reaps the shell
    // while the real process is orphaned inside the container.
    for (const lang of JUDGE_LANGUAGES) {
      expect(buildShellCommand(lang, TIMEOUTS)).toContain("exec ");
    }
  });

  /**
   * Measured behaviour, not a style choice: `timeout -s KILL` ALWAYS exits 137,
   * never 124, because SIGKILL takes the child down before timeout can report a
   * clean timeout. 137 is also what the OOM-killer produces, so `-s KILL` makes
   * every TLE indistinguishable from a memory bomb — and reports both as
   * runtime errors. `-s TERM` exits 124, and `-k` supplies the uncatchable
   * follow-up that SIGTERM alone lacks.
   *
   * Reverting this to the "obviously safer" `-s KILL` silently breaks TLE
   * attribution, and only the Phase 4 corpus catches it.
   */
  it("times out with TERM plus a KILL follow-up, never bare KILL", () => {
    for (const lang of JUDGE_LANGUAGES) {
      const cmd = buildShellCommand(lang, TIMEOUTS);
      expect(cmd).toContain(`timeout -k ${KILL_GRACE_SECONDS} -s TERM`);
      expect(cmd).not.toContain("-s KILL");
    }
  });

  it("gives the compile step its own, longer budget", () => {
    // One combined limit could not distinguish a hung compiler from a looping
    // program: both would surface as the same wall-clock kill.
    const cmd = buildShellCommand("java", { compileSeconds: 10, runSeconds: 5 });
    expect(cmd).toContain("-s TERM 10 javac");
    expect(cmd).toContain("-s TERM 5 java ");
  });

  it("applies the run timeout to interpreted languages too", () => {
    const cmd = buildShellCommand("python", { compileSeconds: 10, runSeconds: 7 });
    expect(cmd).toBe(`exec timeout -k ${KILL_GRACE_SECONDS} -s TERM 7 python3 -I main.py`);
  });
});

describe("assertShellSafe", () => {
  it("accepts the real language specs", () => {
    for (const lang of JUDGE_LANGUAGES) {
      const spec = LANGUAGE_SPECS[lang];
      expect(() => assertShellSafe(spec.run)).not.toThrow();
      if (spec.compile) expect(() => assertShellSafe(spec.compile!)).not.toThrow();
    }
  });

  it.each([
    ["semicolon", "a;rm -rf /"],
    ["substitution", "$(whoami)"],
    ["backtick", "`id`"],
    ["pipe", "a|b"],
    ["redirect", "a>b"],
    ["space", "two words"],
    ["ampersand", "a&&b"],
  ])("rejects a token containing a %s", (_label, token) => {
    expect(() => assertShellSafe([token])).toThrow(/Unsafe token/);
  });
});

describe("C++ precompiled-header flags", () => {
  /**
   * GCC silently ignores a PCH built with different flags — no warning, no
   * error, just a ~600ms slowdown on every C++ submission. The compile flags
   * here and the ones in cpp.Dockerfile must stay identical, and nothing at
   * runtime will tell you when they drift.
   */
  it("passes -I/opt/pch with the std the header was built against", () => {
    const compile = LANGUAGE_SPECS.cpp.compile!;
    expect(compile).toContain("-I/opt/pch");
    expect(compile).toContain("-std=gnu++14");
    // No -O2: Judge0 compiled without it, and adding it would flip TLE-boundary
    // submissions to accepted — a verdict change disguised as an optimisation.
    expect(compile).not.toContain("-O2");
  });
});
