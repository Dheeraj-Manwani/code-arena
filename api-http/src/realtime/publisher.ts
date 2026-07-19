import WebSocket from "ws";
import { getRoomClients, getUserClients } from "./rooms";
import { getClientState } from "./clients";
import type {
  ContestSubmissionResultEvent,
  PracticeSubmissionResultEvent,
  SubmissionResultEvent,
} from "./bus";

function sendIfOpen(ws: WebSocket, message: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

/**
 * Deliver a submission result without leaking other users' scores (issues.md §8.1):
 * - the full verdict (status, points, test cases) goes ONLY to the submitting
 *   user's own socket(s);
 * - everyone else in the room gets an anonymised LEADERBOARD_UPDATE that just tells
 *   their leaderboard panel to refetch (issues.md §1.1) — it carries no user data.
 *
 * Ported unchanged from realtime-gateway; now driven by the in-process bus
 * (see realtime/server.ts) instead of a Redis subscription.
 */
function publishContestResult(event: ContestSubmissionResultEvent): void {
  for (const ws of getRoomClients(event.contestId)) {
    if (ws.readyState !== WebSocket.OPEN) {
      continue;
    }

    const state = getClientState(ws);
    if (state && state.userId === event.userId) {
      sendIfOpen(ws, { type: "SUBMISSION_RESULT", data: event });
    }

    sendIfOpen(ws, {
      type: "LEADERBOARD_UPDATE",
      data: { contestId: event.contestId },
    });
  }
}

/**
 * A practice verdict goes to the submitter's own sockets and nowhere else
 * (PRACTICE_MODE_AND_NAVIGATION.md §4.2).
 *
 * No contest room to broadcast into and no LEADERBOARD_UPDATE: practice is
 * unscored, so there is no ranking for anyone to refetch.
 */
function publishPracticeResult(event: PracticeSubmissionResultEvent): void {
  for (const ws of getUserClients(event.userId)) {
    sendIfOpen(ws, { type: "SUBMISSION_RESULT", data: event });
  }
}

export function publishSubmissionResult(event: SubmissionResultEvent): void {
  if (event.scope === "contest") {
    publishContestResult(event);
    return;
  }
  publishPracticeResult(event);
}
