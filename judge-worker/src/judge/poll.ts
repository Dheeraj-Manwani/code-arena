import judge0Client from "./client";
import { POLL_MAX_ATTEMPTS, POLL_INTERVAL_MS, JUDGE0_TERMINAL_STATUSES } from "../queue/constants";
import { PollTimeoutError, JudgeApiError } from "../errors";
import type { Judge0StatusResponse } from "../schema/judge0.schema";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function pollForVerdict(token: string): Promise<Judge0StatusResponse> {
  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
    const response = await judge0Client
      .get<Judge0StatusResponse>(
        `/submissions/${token}?base64_encoded=false&fields=token,status,stdout,stderr,time,memory,compile_output`
      )
      .catch((err) => {
        if (err.response) {
          throw new JudgeApiError(err.response.status, err.response.data);
        }
        throw err;
      });

    const statusId = response.data.status.id;

    if (JUDGE0_TERMINAL_STATUSES.has(statusId)) {
      return response.data;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new PollTimeoutError(token);
}
