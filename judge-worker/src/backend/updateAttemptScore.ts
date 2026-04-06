import backendClient from "./client";
import { logger } from "../logger";

// TODO: implement PATCH /api/internal/attempts/:attemptId/score in api-http
//       it must do: ContestAttempt.totalPoints += pointsToAdd (use prisma atomic increment)
export async function updateAttemptScore(
  attemptId: number,
  pointsToAdd: number
): Promise<void> {
  const maxRetries = 3;
  const retryDelay = 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await backendClient.patch(`/api/internal/attempts/${attemptId}/score`, {
        pointsToAdd,
      });
      return;
    } catch (err) {
      const isNetworkError =
        err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ECONNREFUSED";
      const isAxiosNetworkError =
        err instanceof Error && "isAxiosError" in err && !(err as Record<string, unknown>).response;

      if ((isNetworkError || isAxiosNetworkError) && attempt < maxRetries) {
        logger.warn(
          { attempt, attemptId },
          "Network error updating attempt score, retrying"
        );
        await new Promise<void>((resolve) => setTimeout(resolve, retryDelay));
        continue;
      }
      throw err;
    }
  }
}
