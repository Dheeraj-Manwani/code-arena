import WebSocket from "ws";
import { getRoomClients } from "./rooms";
import { getClientState } from "./clients";

interface SubmissionResultPayload {
  type: "SUBMISSION_RESULT";
  contestId: number;
  userId: number;
  [key: string]: unknown;
}

/**
 * Deliver a submission result without leaking other users' scores (issues.md §8.1):
 * - the full verdict (status, points, test cases) goes ONLY to the submitting
 *   user's own socket(s);
 * - everyone else in the room gets an anonymised LEADERBOARD_UPDATE that just tells
 *   their leaderboard panel to refetch (issues.md §1.1) — it carries no user data.
 */
export function publishSubmissionResult(payload: SubmissionResultPayload): void {
  const clients = getRoomClients(payload.contestId);
  for (const ws of clients) {
    if (ws.readyState !== WebSocket.OPEN) {
      continue;
    }

    const state = getClientState(ws);
    if (state && state.userId === payload.userId) {
      ws.send(JSON.stringify({ type: "SUBMISSION_RESULT", data: payload }));
    }

    ws.send(
      JSON.stringify({
        type: "LEADERBOARD_UPDATE",
        data: { contestId: payload.contestId },
      })
    );
  }
}
