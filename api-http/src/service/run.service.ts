import type { RunCodeSchemaType } from "../schema/submission.schema";
import { AppError } from "../errors/app-error";
import { generateJudgeBoilerplate, type SerializedTestCase } from "../util/boilerplate";
import { runOnce } from "../judge/runOnce";
import { Semaphore } from "../lib/semaphore";
import { RUN_TIMEOUT_MS, RUN_MAX_CONCURRENCY } from "../jobs/constants";

// Cap concurrent runs so a burst can't spawn unbounded in-flight Judge0 calls
// (Economy Service Phase 6). Requests that can't get a slot within RUN_TIMEOUT_MS
// time out with a 504.
const runSemaphore = new Semaphore(RUN_MAX_CONCURRENCY);

/**
 * Execute user code once and return the Judge0 result (Economy Service Phase 2).
 *
 * Previously this enqueued a `judge-run` job, subscribed to a unique Redis
 * channel, and waited for the worker to publish back (35s timeout). In the
 * monolith the run executes in-process, so we simply await `runOnce` — no Redis
 * pub/sub, no per-request subscriber, nothing lost on restart (issues.md §1.2/§1.3).
 */
export const runCode = async (data: RunCodeSchemaType) => {
  const { code, language, signature, testCases } = data;

  let sourceCode = code;
  if (signature && testCases && testCases.length > 0) {
    const serialized: SerializedTestCase[] = testCases.map((tc) => ({
      input: tc.input,
      expectedOutput: tc.expectedOutput,
    }));
    const harnesses = generateJudgeBoilerplate(signature, code, serialized);
    sourceCode = harnesses[language];
  }

  let timeoutRef: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutRef = setTimeout(() => {
      reject(new AppError("Run request timed out", 504, "RUN_EXECUTION_FAILED"));
    }, RUN_TIMEOUT_MS);
  });

  // Acquire a run slot, then execute — both raced against the timeout so a request
  // that waits too long for a slot (or for Judge0) fails with 504 rather than hanging.
  const runPromise = (async () => {
    const release = await runSemaphore.acquire();
    try {
      return await runOnce(language, sourceCode);
    } finally {
      release();
    }
  })();

  try {
    const result = await Promise.race([runPromise, timeoutPromise]);
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      compileOutput: result.compileOutput,
      status: result.status,
      memory: result.memory,
      executionTime: result.executionTime,
    };
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : "Run execution failed";
    throw new AppError(message, 502, "RUN_EXECUTION_FAILED");
  } finally {
    if (timeoutRef) {
      clearTimeout(timeoutRef);
    }
  }
};
