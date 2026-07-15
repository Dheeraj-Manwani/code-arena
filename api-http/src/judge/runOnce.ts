import { submitRunToJudge0 } from "./submit";
import { pollForVerdict } from "./poll";
import type { Language } from "../schema/language.schema";
import { LANGUAGE_TO_JUDGE_JOB } from "../jobs/constants";

export interface RunOnceResult {
  token: string;
  status: { id: number; description: string };
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  memory: number | null;
  executionTime: number | null;
}

/**
 * Execute a single "run" against Judge0 in-process and return the raw result.
 *
 * This replaces the old cross-process dance for `/api/run` (enqueue a `judge-run`
 * job → worker publishes on a Redis channel → api-http's subscriber resolves).
 * In the monolith the run executes inline, so the HTTP handler simply awaits this
 * (Economy Service Phase 2). No Redis pub/sub, no per-request subscriber.
 */
export async function runOnce(language: Language, sourceCode: string): Promise<RunOnceResult> {
  const judgeLanguage = LANGUAGE_TO_JUDGE_JOB[language];
  const token = await submitRunToJudge0(judgeLanguage, sourceCode);
  const judgeResponse = await pollForVerdict(token);

  const executionTime =
    judgeResponse.time !== null ? Math.round(parseFloat(judgeResponse.time) * 1000) : null;

  return {
    token: judgeResponse.token,
    status: judgeResponse.status,
    stdout: judgeResponse.stdout,
    stderr: judgeResponse.stderr,
    compileOutput: judgeResponse.compile_output,
    memory: judgeResponse.memory,
    executionTime,
  };
}
