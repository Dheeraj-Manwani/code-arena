import { withWorkspace } from "./workspace";
import { runContainer } from "./docker";
import { mapToJudge0Status } from "./mapStatus";
import type { Executor, ExecutionRequest } from "../executor";
import type { Judge0StatusResponse } from "../../schema/judge0.schema";

/**
 * The container execution backend (SELF_HOSTED_JUDGE.md Phase 3).
 *
 * Three steps, each in its own module so they stay independently testable:
 *   workspace.ts — write the program to a scratch dir, clean up unconditionally
 *   docker.ts    — run it under the sandbox, enforce limits, capture output
 *   mapStatus.ts — translate the outcome into the Judge0 status vocabulary
 *
 * Notably absent: anything about test cases. The generated harness bakes them
 * into the source and compares in-process, so this backend only ever compiles
 * and runs one file — the same contract Judge0 was fulfilling.
 */
export const localExecutor: Executor = {
  name: "local",

  async execute(req: ExecutionRequest): Promise<Judge0StatusResponse> {
    return withWorkspace(req.language, req.sourceCode, async (workspace) => {
      const outcome = await runContainer(req.language, workspace);
      return mapToJudge0Status(outcome);
    });
  },
};
