import { submitSourceToJudge0 } from "./submit";
import { pollForVerdict } from "./poll";
import type { Executor, ExecutionRequest } from "../executor";
import type { Judge0StatusResponse } from "../../schema/judge0.schema";

/**
 * The Judge0 (RapidAPI) execution backend — submit, then poll until terminal.
 *
 * This is the behavior api-http has always had, now expressed as an `Executor`
 * (Self-Hosted Judge Phase 1). Nothing about the wire protocol changed; the two
 * former call sites (`submitProcessor`, `runOnce`) each did exactly this pair of
 * calls in sequence, so collapsing them loses nothing.
 *
 * Note the latency this backend implies: a submission that finishes in 200ms
 * still waits for the next poll tick, so worst case is
 * POLL_MAX_ATTEMPTS × POLL_INTERVAL_MS. Removing that is one of the wins of the
 * local backend (SELF_HOSTED_JUDGE.md §10).
 */
export const judge0Executor: Executor = {
  name: "judge0",

  async execute(req: ExecutionRequest): Promise<Judge0StatusResponse> {
    const token = await submitSourceToJudge0(req.language, req.sourceCode);
    return pollForVerdict(token);
  },
};
