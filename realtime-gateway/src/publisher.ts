import WebSocket from "ws";
import { getRoomClients } from "./rooms";

interface SubmissionResultPayload {
  type: "SUBMISSION_RESULT";
  contestId: number;
  [key: string]: unknown;
}

export function publishSubmissionResult(payload: SubmissionResultPayload): void {
  const clients = getRoomClients(payload.contestId);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "SUBMISSION_RESULT",
          data: payload,
        })
      );
    }
  }
}
