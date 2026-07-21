/**
 * Adversarial corpus for the container sandbox (SELF_HOSTED_JUDGE.md Phase 4).
 *
 * Everything else in this migration is plumbing; this is the part that decides
 * whether running untrusted code on our own box is defensible. Each case is
 * written the way an attacker would write it, and asserts two things: the host
 * is unaffected, and the submitter gets the RIGHT verdict rather than a
 * plausible-looking wrong one.
 *
 * Requires a Docker daemon and the four judge images:
 *   pnpm run judge-images
 *   npx vitest run --config vitest.integration.config.ts src/judge/local/sandbox.itest.ts
 *
 * These are `.itest.ts` because they need real infrastructure — the DB-free
 * unit suite must stay fast, and `mapStatus.test.ts` already covers the mapping
 * logic in isolation.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFile } from "node:child_process";
import { readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { promisify } from "node:util";

import { localExecutor } from "./index";
import { runContainer } from "./docker";
import { withWorkspace } from "./workspace";
import { LOCAL_OUTPUT_CAP_BYTES } from "../../jobs/constants";
import { generateJudgeBoilerplate, MANUAL_SIGNATURE, MANUAL_TEST_CASES } from "../../util/boilerplate/judgeBoilerplate";
import type { JudgeLanguage } from "../../schema/job.schema";

const exec = promisify(execFile);

const run = (language: JudgeLanguage, sourceCode: string) =>
  localExecutor.execute({ language, sourceCode });

/** Container names still running from this suite. Any is a leak. */
async function liveJudgeContainers(): Promise<string[]> {
  const { stdout } = await exec("docker", [
    "ps", "--filter", "name=judge-", "--format", "{{.Names}}",
  ]);
  return stdout.split("\n").map((s) => s.trim()).filter(Boolean);
}

async function judgeWorkspaces(): Promise<string[]> {
  const entries = await readdir(tmpdir());
  return entries.filter((e) => e.startsWith("code-arena-judge-"));
}

beforeAll(async () => {
  // Fail loudly rather than reporting a green suite that never ran a container.
  await exec("docker", ["image", "inspect", "code-arena-judge-python:3.8"]).catch(() => {
    throw new Error("Judge images missing. Run: pnpm run judge-images");
  });
}, 60_000);

afterAll(async () => {
  const leaked = await liveJudgeContainers();
  if (leaked.length > 0) {
    // Don't leave a broken run's containers burning CPU on the dev box.
    await Promise.all(leaked.map((n) => exec("docker", ["kill", n]).catch(() => {})));
    throw new Error(`Suite leaked containers: ${leaked.join(", ")}`);
  }
}, 60_000);

describe("resource exhaustion", () => {
  it("kills an infinite loop and reports TLE", async () => {
    const res = await run("python", "while True:\n    pass\n");
    expect(res.status.id).toBe(5);
  }, 30_000);

  it("kills a sleeping process too, not just a busy one", async () => {
    // A blocked process burns no CPU; a CPU-time limit alone would never fire.
    const res = await run("python", "import time\ntime.sleep(120)\n");
    expect(res.status.id).toBe(5);
  }, 30_000);

  /**
   * Documents a known, accepted limitation rather than asserting correctness.
   *
   * A submission that traps SIGTERM survives to the `-k` SIGKILL and comes back
   * as 137, which maps to a runtime error instead of TLE. Both are
   * non-accepted, so nothing can be scored by doing this — the only cost is a
   * less precise message. If this ever starts returning 5, the disambiguation
   * improved and this expectation should be tightened.
   */
  it("still terminates a submission that traps SIGTERM", async () => {
    const src = `
import signal, time
signal.signal(signal.SIGTERM, lambda *a: None)
while True:
    time.sleep(0.1)
`;
    const res = await run("python", src);
    expect([5, 11]).toContain(res.status.id);
    expect(res.status.id).not.toBe(3);
  }, 30_000);

  it("contains a fork bomb via --pids-limit", async () => {
    const res = await run("python", "import os\nwhile True:\n    os.fork()\n");
    // Either the fork fails (non-zero exit) or the whole thing is killed.
    // What matters is that it terminates and does not look like a pass.
    expect([5, 11]).toContain(res.status.id);
  }, 60_000);

  it("OOM-kills a memory bomb and reports a runtime error, not TLE", async () => {
    // Reported as TLE, a user would go optimise their loop instead of their
    // allocations — the verdict has to name the real failure.
    const res = await run(
      "python",
      "buf = []\nwhile True:\n    buf.append(bytearray(10 * 1024 * 1024))\n"
    );
    expect(res.status.id).toBe(11);
  }, 60_000);

  it("caps runaway output instead of filling the disk", async () => {
    const res = await run("python", 'while True:\n    print("x" * 1000)\n');
    expect(res.status.id).toBe(5);
    // Generous margin: the cap is enforced per chunk, so the last chunk can
    // overshoot. What matters is bounded, not exact.
    expect((res.stdout ?? "").length).toBeLessThan(LOCAL_OUTPUT_CAP_BYTES * 3);
  }, 60_000);

  it("stops a program from filling the writable tmpfs", async () => {
    const src = `
import sys
try:
    with open("/tmp/fill", "wb") as f:
        for _ in range(4096):          # 4GB attempted against a 64m tmpfs
            f.write(b"\\0" * 1024 * 1024)
    print("FILLED")
except Exception:
    print("BLOCKED")
`;
    const res = await run("python", src);
    expect(res.stdout ?? "").not.toContain("FILLED");
  }, 60_000);
});

describe("isolation", () => {
  it("blocks outbound network connections", async () => {
    const src = `
import socket
socket.setdefaulttimeout(3)
try:
    socket.create_connection(("1.1.1.1", 80))
    print("REACHED")
except Exception:
    print("BLOCKED")
`;
    const res = await run("python", src);
    expect(res.stdout ?? "").toContain("BLOCKED");
    expect(res.stdout ?? "").not.toContain("REACHED");
  }, 30_000);

  it("blocks DNS resolution", async () => {
    const src = `
import socket
socket.setdefaulttimeout(3)
try:
    socket.gethostbyname("example.com")
    print("RESOLVED")
except Exception:
    print("BLOCKED")
`;
    const res = await run("python", src);
    expect(res.stdout ?? "").not.toContain("RESOLVED");
  }, 30_000);

  it("does not leak the host environment into the container", async () => {
    // Regression guard for someone adding `-e` to the docker args: api-http's
    // env holds DATABASE_URL and the JWT signing secrets.
    const src = 'import os\nprint("|".join(os.environ.keys()))\n';
    const res = await run("python", src);
    const keys = (res.stdout ?? "").toUpperCase();
    for (const secret of ["DATABASE_URL", "ACCESS_TOKEN_SECRET", "REFRESH_TOKEN_SECRET", "RAPIDAPI"]) {
      expect(keys).not.toContain(secret);
    }
  }, 30_000);

  it("mounts the workspace read-only", async () => {
    const src = `
try:
    open("/work/evil.txt", "w").write("x")
    print("WROTE_WORKSPACE")
except Exception:
    print("BLOCKED")
`;
    const res = await run("python", src);
    expect(res.stdout ?? "").toContain("BLOCKED");
  }, 30_000);

  it("mounts the root filesystem read-only", async () => {
    const src = `
for path in ("/etc/evil", "/usr/bin/evil", "/evil"):
    try:
        open(path, "w").write("x")
        print("WROTE " + path)
    except Exception:
        pass
print("DONE")
`;
    const res = await run("python", src);
    expect(res.stdout ?? "").toContain("DONE");
    expect(res.stdout ?? "").not.toContain("WROTE");
  }, 30_000);

  it("runs as a non-root user", async () => {
    const res = await run("python", "import os\nprint(os.getuid())\n");
    expect((res.stdout ?? "").trim()).not.toBe("0");
  }, 30_000);

  it("reaps background processes when the container exits", async () => {
    // A submission that daemonises must not outlive its verdict.
    const src = `
import subprocess, sys
subprocess.Popen([sys.executable, "-c", "import time; time.sleep(300)"])
print("SPAWNED")
`;
    const res = await run("python", src);
    expect(res.stdout ?? "").toContain("SPAWNED");
    expect(await liveJudgeContainers()).toEqual([]);
  }, 30_000);
});

describe("compile failures", () => {
  it("reports invalid C++ as a compile error with diagnostics", async () => {
    const res = await run("cpp", "int main() { this is not c++ }");
    expect(res.status.id).toBe(6);
    expect(res.compile_output ?? "").toMatch(/error/i);
    expect(res.stderr).toBeNull();
  }, 60_000);

  it("reports invalid Java as a compile error", async () => {
    const res = await run("java", "public class Main { not valid }");
    expect(res.status.id).toBe(6);
    expect(res.compile_output ?? "").toMatch(/error/i);
  }, 60_000);

  it("maps a compile that exceeds its own budget to a compile error, not TLE", async () => {
    // Drives runContainer directly with a 1s compile budget so the case is fast
    // and deterministic. A hung compiler must not be blamed on the user's
    // algorithm — the timeout's status is swallowed by `|| exit 101`.
    const src = `
#include <bits/stdc++.h>
template<int N> struct F { static const long long v = F<N-1>::v + F<N-2>::v; };
template<> struct F<0> { static const long long v = 0; };
template<> struct F<1> { static const long long v = 1; };
int main(){ std::cout << F<300>::v; }
`;
    const outcome = await withWorkspace("cpp", src, (ws) =>
      runContainer("cpp", ws, { compileSeconds: 1, runSeconds: 5 })
    );
    // Either it compiled inside 1s (fine) or it was cut off — never a TLE.
    if (outcome.exitCode !== 0) {
      expect(outcome.exitCode).toBe(101);
    }
  }, 60_000);
});

describe("correct solutions are not punished", () => {
  const APP_LANG = { cpp: "cpp", python: "python", javascript: "js", java: "java" } as const;

  const SOLUTIONS: Record<JudgeLanguage, string> = {
    cpp: `vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int,int> seen;
    for (int i = 0; i < (int)nums.size(); i++) {
        if (seen.count(target - nums[i])) return {seen[target - nums[i]], i};
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

  /**
   * The limits that stop an attacker must not stop a legitimate submission.
   * Java is the one to watch: the JVM sizes its heap from the host's memory
   * rather than the cgroup, so a cap that is generous for C++ OOM-kills correct
   * Java before it runs a single test case.
   */
  for (const lang of Object.keys(SOLUTIONS) as JudgeLanguage[]) {
    it(`accepts a correct ${lang} solution under the sandbox limits`, async () => {
      const harness = generateJudgeBoilerplate(
        MANUAL_SIGNATURE,
        SOLUTIONS[lang],
        MANUAL_TEST_CASES
      )[APP_LANG[lang]];

      const res = await run(lang, harness);
      expect(res.status.id).toBe(3);
      expect(res.stdout ?? "").toContain("__PASS__");
      expect((res.stdout ?? "").match(/__PASS__/g) ?? []).toHaveLength(MANUAL_TEST_CASES.length);
    }, 90_000);
  }

  it("suppresses debug prints so they cannot forge markers", async () => {
    // A submission that prints __PASS__ itself must not be able to score.
    const cheat = `def two_sum(nums, target):
    print("__PASS__")
    print("__PASS__")
    return [99, 99]`;
    const harness = generateJudgeBoilerplate(MANUAL_SIGNATURE, cheat, MANUAL_TEST_CASES).python;

    const res = await run("python", harness);
    const passes = (res.stdout ?? "").match(/__PASS__/g) ?? [];
    expect(passes).toHaveLength(0);
  }, 30_000);
});

describe("hygiene under load", () => {
  it("leaks no containers or workspaces across repeated runs", async () => {
    const before = (await judgeWorkspaces()).length;

    for (let i = 0; i < 10; i++) {
      await run("python", `print(${i})`);
    }

    expect(await liveJudgeContainers()).toEqual([]);
    // A leak here compounds: one directory per submission over a contest.
    expect((await judgeWorkspaces()).length).toBe(before);
  }, 120_000);

  it("keeps concurrent executions isolated from each other", async () => {
    // Shared workspace or crossed stdout would show up as the wrong answer
    // landing against the wrong submission — silently, and only under load.
    const results = await Promise.all(
      [1, 2, 3, 4].map((n) => run("python", `print(${n} * 111)`))
    );

    expect(results.map((r) => (r.stdout ?? "").trim())).toEqual(["111", "222", "333", "444"]);
    expect(await liveJudgeContainers()).toEqual([]);
  }, 120_000);
});
