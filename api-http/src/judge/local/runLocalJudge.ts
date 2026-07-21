/**
 * Standalone CLI for the container judge (SELF_HOSTED_JUDGE.md Phase 2).
 *
 * Deliberately NOT wired into the app — Phase 2's whole point is to prove the
 * images work before anything on the request path can depend on them. Phase 3
 * turns this into `LocalExecutor` with output caps, timeouts, and status mapping.
 *
 *   pnpm run judge-local -- --lang cpp            # generated twoSum harness
 *   pnpm run judge-local -- --lang python --hello # hello-world
 *   pnpm run judge-local -- --lang java --file path/to/Main.java
 *
 * Prints the raw container outcome. It does NOT map to a verdict; that is
 * `mapStatus.ts` in Phase 3.
 */
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { LANGUAGE_SPECS, isJudgeLanguage, JUDGE_LANGUAGES } from "./languages";
import { buildDockerArgs, COMPILE_FAILED_EXIT } from "./command";
import { LOCAL_COMPILE_TIMEOUT_S, LOCAL_RUN_TIMEOUT_S } from "../../jobs/constants";
import { generateJudgeBoilerplate, MANUAL_SIGNATURE, MANUAL_TEST_CASES } from "../../util/boilerplate/judgeBoilerplate";
import type { Language } from "../../schema/language.schema";
import type { JudgeLanguage } from "../../schema/job.schema";

/** Judge-side language name → the app-side spelling the boilerplate generator uses. */
const TO_APP_LANGUAGE: Record<JudgeLanguage, Language> = {
  cpp: "cpp",
  python: "python",
  javascript: "js",
  java: "java",
};

const HELLO_WORLD: Record<JudgeLanguage, string> = {
  cpp: '#include <bits/stdc++.h>\nint main(){ std::cout << "hello" << std::endl; }',
  python: 'print("hello")',
  javascript: 'console.log("hello");',
  java: 'public class Main { public static void main(String[] a){ System.out.println("hello"); } }',
};

/**
 * Reference twoSum solutions, one per language, so the CLI can exercise the REAL
 * generated harness (markers, comparison, stdout suppression) rather than just
 * proving the toolchain starts.
 */
const TWO_SUM: Record<JudgeLanguage, string> = {
  cpp: `vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int,int> seen;
    for (int i = 0; i < (int)nums.size(); i++) {
        int need = target - nums[i];
        if (seen.count(need)) return {seen[need], i};
        seen[nums[i]] = i;
    }
    return {};
}`,
  python: `def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i
    return []`,
  javascript: `function twoSum(nums, target) {
    const seen = new Map();
    for (let i = 0; i < nums.length; i++) {
        if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i];
        seen.set(nums[i], i);
    }
    return [];
}`,
  java: `class Solution {
    public static int[] twoSum(int[] nums, int target) {
        java.util.Map<Integer,Integer> seen = new java.util.HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            if (seen.containsKey(target - nums[i])) return new int[]{seen.get(target - nums[i]), i};
            seen.put(nums[i], i);
        }
        return new int[]{};
    }
}`,
};

interface RunOutcome {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  wallMs: number;
}

function runContainer(lang: JudgeLanguage, workspace: string): Promise<RunOutcome> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    // argv array, never a shell string: the workspace path is interpolated by
    // the OS, not by a shell, so a path with spaces cannot become two arguments.
    const args = buildDockerArgs(lang, workspace, {
      timeouts: { compileSeconds: LOCAL_COMPILE_TIMEOUT_S, runSeconds: LOCAL_RUN_TIMEOUT_S },
      containerName: `judge-cli-${Date.now()}`,
    });
    const child = spawn("docker", args, { stdio: ["ignore", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => (stdout += c.toString()));
    child.stderr.on("data", (c) => (stderr += c.toString()));

    child.on("error", reject);
    child.on("close", (exitCode, signal) => {
      resolve({ exitCode, signal, stdout, stderr, wallMs: Date.now() - started });
    });
  });
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    lang: get("--lang"),
    file: get("--file"),
    hello: argv.includes("--hello"),
  };
}

function sourceFor(lang: JudgeLanguage, opts: { file?: string; hello: boolean }): string {
  if (opts.file) {
    return readFileSync(opts.file, "utf8");
  }
  if (opts.hello) {
    return HELLO_WORLD[lang];
  }
  // The real thing: user code merged into the generated marker harness.
  const harnesses = generateJudgeBoilerplate(MANUAL_SIGNATURE, TWO_SUM[lang], MANUAL_TEST_CASES);
  return harnesses[TO_APP_LANGUAGE[lang]];
}

async function main() {
  const opts = parseArgs();

  if (!opts.lang || !isJudgeLanguage(opts.lang)) {
    console.error(`usage: pnpm run judge-local -- --lang <${JUDGE_LANGUAGES.join("|")}> [--hello] [--file <path>]`);
    process.exit(2);
  }

  const lang = opts.lang;
  const spec = LANGUAGE_SPECS[lang];
  const source = sourceFor(lang, opts);

  const workspace = await mkdtemp(join(tmpdir(), "judge-cli-"));
  try {
    await writeFile(join(workspace, spec.sourceFile), source, "utf8");

    console.log(`toolchain : ${spec.toolchain}`);
    console.log(`image     : ${spec.image}`);
    console.log(`workspace : ${workspace}/${spec.sourceFile}`);
    console.log("");

    const outcome = await runContainer(lang, workspace);

    console.log(`exit      : ${outcome.exitCode}${outcome.signal ? ` (signal ${outcome.signal})` : ""}`);
    console.log(`wall      : ${outcome.wallMs}ms`);
    if (outcome.exitCode === COMPILE_FAILED_EXIT) {
      console.log("result    : COMPILE ERROR (→ Judge0 status 6 in Phase 3)");
    }
    console.log("");
    console.log("--- stdout ---");
    console.log(outcome.stdout || "(empty)");
    console.log("--- stderr ---");
    console.log(outcome.stderr || "(empty)");

    // Exit non-zero when the container did, so build.sh / CI can gate on it.
    process.exitCode = outcome.exitCode === 0 ? 0 : 1;
  } finally {
    // Unconditional: a leaked workspace per invocation is how a dev box fills up.
    await rm(workspace, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
