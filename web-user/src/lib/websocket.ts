import { useAuthStore } from "@/stores/auth.store";
import { toast } from "react-hot-toast";

export interface SubmissionResultEvent {
  type: "SUBMISSION_RESULT";
  data: {
    type: "SUBMISSION_RESULT";
    dsaSubmissionId: number;
    attemptId: number;
    userId: number;
    contestId: number;
    status: "accepted" | "wrong_answer" | "time_limit_exceeded" | "runtime_error";
    pointsEarned: number;
    testCasesPassed: number;
    totalTestCases: number;
  };
}

type SubmissionResultListener = (event: SubmissionResultEvent["data"]) => void;

function getWsToastMessage(payload: Record<string, unknown>): string {
  if (payload.type === "ERROR" && typeof payload.message === "string") {
    return `WS Error: ${payload.message}`;
  }

  if (payload.type === "CONNECTED" && typeof payload.contestId === "number") {
    return `WS Connected to contest ${payload.contestId}`;
  }

  if (
    payload.type === "SUBMISSION_RESULT" &&
    payload.data &&
    typeof payload.data === "object"
  ) {
    const data = payload.data as Record<string, unknown>;
    const status = typeof data.status === "string" ? data.status : "updated";
    return `WS Submission Result: ${status}`;
  }

  return `WS Message: ${JSON.stringify(payload)}`;
}

class ContestWebSocketClient {
  private socket: WebSocket | null = null;
  private contestId: number | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private listeners = new Set<SubmissionResultListener>();
  private manuallyDisconnected = false;

  connect(contestId: number): void {
    this.contestId = contestId;
    this.manuallyDisconnected = false;
    this.openSocket();
  }

  onSubmissionResult(listener: SubmissionResultListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  disconnect(): void {
    this.manuallyDisconnected = true;
    this.clearReconnectTimer();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  private openSocket(): void {
    if (this.socket || this.contestId == null) {
      return;
    }

    const url = import.meta.env.VITE_WS_URL;
    if (!url) {
      return;
    }

    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      const token = useAuthStore.getState().accessToken;
      if (!token || this.contestId == null || !this.socket) {
        this.socket?.close();
        return;
      }
      this.socket.send(
        JSON.stringify({
          type: "AUTH",
          token,
          contestId: this.contestId,
        })
      );
    };

    this.socket.onmessage = (event: MessageEvent<string>) => {
      try {
        const parsed: unknown = JSON.parse(event.data);
        if (!parsed || typeof parsed !== "object") {
          toast("WS Message received");
          return;
        }
        const payload = parsed as Record<string, unknown>;
        toast(getWsToastMessage(payload));
        if (payload.type !== "SUBMISSION_RESULT" || !payload.data || typeof payload.data !== "object") {
          return;
        }
        const data = payload.data as SubmissionResultEvent["data"];
        for (const listener of this.listeners) {
          listener(data);
        }
      } catch {
        // Ignore malformed messages from socket.
      }
    };

    this.socket.onclose = () => {
      this.socket = null;
      if (this.manuallyDisconnected) {
        return;
      }

      if (this.reconnectAttempts >= 5) {
        return;
      }

      this.reconnectAttempts += 1;
      this.reconnectTimer = window.setTimeout(() => {
        this.openSocket();
      }, 3000);
    };
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer != null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

export const contestWebSocket = new ContestWebSocketClient();
