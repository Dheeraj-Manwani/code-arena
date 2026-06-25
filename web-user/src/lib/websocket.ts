import { useAuthStore } from "@/stores/auth.store";

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

/** Anonymised "the leaderboard changed" signal — carries no per-user data (§8.1/§1.1). */
export interface LeaderboardUpdateEvent {
  type: "LEADERBOARD_UPDATE";
  data: { contestId: number };
}

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "offline";

type SubmissionResultListener = (event: SubmissionResultEvent["data"]) => void;
type LeaderboardUpdateListener = (event: LeaderboardUpdateEvent["data"]) => void;
type StatusListener = (status: ConnectionStatus) => void;

// Exponential backoff with a generous ceiling so a long outage keeps retrying
// instead of giving up after a few seconds (issues.md §6.6).
const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const MAX_RECONNECT_ATTEMPTS = 12;

class ContestWebSocketClient {
  private socket: WebSocket | null = null;
  private contestId: number | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private submissionListeners = new Set<SubmissionResultListener>();
  private leaderboardListeners = new Set<LeaderboardUpdateListener>();
  private statusListeners = new Set<StatusListener>();
  private manuallyDisconnected = false;
  private status: ConnectionStatus = "offline";

  connect(contestId: number): void {
    this.contestId = contestId;
    this.manuallyDisconnected = false;
    this.reconnectAttempts = 0;
    this.openSocket();
  }

  onSubmissionResult(listener: SubmissionResultListener): () => void {
    this.submissionListeners.add(listener);
    return () => {
      this.submissionListeners.delete(listener);
    };
  }

  onLeaderboardUpdate(listener: LeaderboardUpdateListener): () => void {
    this.leaderboardListeners.add(listener);
    return () => {
      this.leaderboardListeners.delete(listener);
    };
  }

  /** Subscribe to connection-status changes; fires immediately with the current status. */
  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  disconnect(): void {
    this.manuallyDisconnected = true;
    this.clearReconnectTimer();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.setStatus("offline");
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status === status) return;
    this.status = status;
    for (const listener of this.statusListeners) {
      listener(status);
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

    this.setStatus(this.reconnectAttempts > 0 ? "reconnecting" : "connecting");
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
      this.setStatus("connected");
    };

    this.socket.onmessage = (event: MessageEvent<string>) => {
      try {
        const parsed: unknown = JSON.parse(event.data);
        if (!parsed || typeof parsed !== "object") {
          return;
        }
        const payload = parsed as Record<string, unknown>;
        if (!payload.data || typeof payload.data !== "object") {
          return;
        }

        if (payload.type === "SUBMISSION_RESULT") {
          const data = payload.data as SubmissionResultEvent["data"];
          for (const listener of this.submissionListeners) {
            listener(data);
          }
        } else if (payload.type === "LEADERBOARD_UPDATE") {
          const data = payload.data as LeaderboardUpdateEvent["data"];
          for (const listener of this.leaderboardListeners) {
            listener(data);
          }
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

      if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        this.setStatus("offline");
        return;
      }

      this.reconnectAttempts += 1;
      this.setStatus("reconnecting");
      const delay = Math.min(
        BASE_RECONNECT_DELAY_MS * 2 ** (this.reconnectAttempts - 1),
        MAX_RECONNECT_DELAY_MS
      );
      this.reconnectTimer = window.setTimeout(() => {
        this.openSocket();
      }, delay);
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
