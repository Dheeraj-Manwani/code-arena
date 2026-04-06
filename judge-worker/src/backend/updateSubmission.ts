import backendClient from "./client";
import { logger } from "../logger";
import type { UpdateSubmissionPayload } from "../schema/job.schema";

// TODO: implement PATCH /api/internal/submissions/dsa/:dsaSubmissionId in api-http
//       it must update DsaSubmission fields: status, pointsEarned, testCasesPassed, totalTestCases, executionTime
export async function updateSubmission(
  dsaSubmissionId: number,
  payload: UpdateSubmissionPayload
): Promise<void> {
  const maxRetries = 3;
  const retryDelay = 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await backendClient.patch(
        `/api/internal/submissions/dsa/${dsaSubmissionId}`,
        payload
      );
      return;
    } catch (err) {
      const isNetworkError =
        err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ECONNREFUSED";
      const isAxiosNetworkError =
        err instanceof Error && "isAxiosError" in err && !(err as Record<string, unknown>).response;

      if ((isNetworkError || isAxiosNetworkError) && attempt < maxRetries) {
        logger.warn(
          { attempt, dsaSubmissionId },
          "Network error updating submission, retrying"
        );
        await new Promise<void>((resolve) => setTimeout(resolve, retryDelay));
        continue;
      }
      throw err;
    }
  }
}
