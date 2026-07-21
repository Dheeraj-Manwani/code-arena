import type { JudgeLanguage } from "../../schema/job.schema";

/**
 * Per-language execution spec for the local (container) backend
 * (SELF_HOSTED_JUDGE.md Phase 2).
 *
 * ## Why these toolchain versions
 *
 * They mirror what Judge0 CE served for the language ids in
 * `jobs/constants.ts#JUDGE0_LANGUAGE_MAP`:
 *
 *   54 → C++ GCC 9.2.0 · 62 → Java OpenJDK 13.0.1
 *   63 → Node.js 12.14.0 · 71 → Python 3.8.1
 *
 * Matching them is a deliberate migration choice, not a preference. Phase 5
 * replays every historical submission and diffs the verdict against the stored
 * one; every version difference shows up there as divergence that has to be
 * triaged by hand. Matching keeps that signal clean. Upgrading is a separate,
 * post-cutover change with its own replay — see Phase 7.
 *
 * Three of the four runtimes are EOL. That is a smaller risk than it sounds:
 * these containers have no network, no persistence, and no secrets, so the
 * network-facing CVEs that make an EOL runtime dangerous mostly do not apply.
 *
 * ## Why the compile flags look conservative
 *
 * Judge0's C++ command is plain `g++ main.cpp` — no `-O2`, and GCC 9 defaults to
 * `-std=gnu++14`. Every submission in the replay corpus passed under those
 * flags, so we use them too. Adding `-O2` would make some currently-TLE
 * submissions pass, which is a verdict change dressed up as an improvement.
 * Revisit after cutover, deliberately.
 */

export interface LanguageSpec {
  /** Docker image tag built by `docker/judge/build.sh`. */
  readonly image: string;
  /** Filename the source is written as inside the workspace. */
  readonly sourceFile: string;
  /**
   * Compile step, or null for interpreted languages. Runs with a longer wall
   * limit than the run step (compilers are legitimately slow; user code is not).
   */
  readonly compile: readonly string[] | null;
  /** Run step. */
  readonly run: readonly string[];
  /** Human-readable toolchain, for logs and divergence reports. */
  readonly toolchain: string;
}

/**
 * `Main.java` is not a preference — the generated Java harness declares
 * `public class Main` (`util/boilerplate/judgeBoilerplate.ts`), and javac
 * requires a public class to live in a file of the same name. Renaming this
 * breaks every Java submission.
 */
export const LANGUAGE_SPECS: Record<JudgeLanguage, LanguageSpec> = {
  cpp: {
    image: "code-arena-judge-cpp:gcc9",
    sourceFile: "main.cpp",
    // -I/opt/pch finds the precompiled bits/stdc++.h baked into the image.
    // GCC silently ignores a PCH built with different flags, so these MUST stay
    // byte-identical to the flags in cpp.Dockerfile or C++ compiles get ~1.5s
    // slower with no error to explain why.
    compile: ["g++", "-std=gnu++14", "-I/opt/pch", "main.cpp", "-o", "/tmp/program"],
    run: ["/tmp/program"],
    toolchain: "GCC 9 (Judge0 id 54)",
  },

  python: {
    image: "code-arena-judge-python:3.8",
    sourceFile: "main.py",
    compile: null,
    // -I: isolated mode. Ignores PYTHON* env vars and skips the CWD on sys.path,
    // so a submission cannot shadow a stdlib module by writing a file next to it.
    run: ["python3", "-I", "main.py"],
    toolchain: "Python 3.8 (Judge0 id 71)",
  },

  javascript: {
    image: "code-arena-judge-node:12",
    sourceFile: "main.js",
    run: ["node", "main.js"],
    compile: null,
    toolchain: "Node.js 12 (Judge0 id 63)",
  },

  java: {
    image: "code-arena-judge-java:13",
    sourceFile: "Main.java",
    compile: ["javac", "-d", "/tmp", "Main.java"],
    /**
     * The JVM reserves a large virtual address space at startup and sizes its
     * default heap from the *host's* memory, not the cgroup limit — on an old
     * JVM that combination gets a correct solution OOM-killed by `--memory`
     * before it runs a single test case.
     *
     * -Xmx pins the heap well below the container limit; SerialGC avoids the
     * parallel collector's per-CPU thread arenas; -Xss buys recursion depth back
     * for DFS-style solutions, which is the trade a competitive judge wants.
     * Phase 4 pins these numbers against the real limits.
     */
    run: [
      "java",
      "-XX:+UseSerialGC",
      "-Xms16m",
      "-Xmx192m",
      "-Xss64m",
      "-cp",
      "/tmp",
      "Main",
    ],
    toolchain: "OpenJDK 13 (Judge0 id 62)",
  },
};

export const JUDGE_LANGUAGES = Object.keys(LANGUAGE_SPECS) as JudgeLanguage[];

export function isJudgeLanguage(value: string): value is JudgeLanguage {
  return Object.prototype.hasOwnProperty.call(LANGUAGE_SPECS, value);
}
