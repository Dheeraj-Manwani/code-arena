import WebSocket from "ws";
import { verifyToken } from "./auth";
import { joinRoom, leaveRoom } from "./rooms";

interface AuthHandshakeMessage {
  type: "AUTH";
  token: string;
  contestId: number;
}

function parseHandshakeMessage(raw: WebSocket.RawData): AuthHandshakeMessage | null {
  try {
    const text = typeof raw === "string" ? raw : raw.toString();
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const msg = parsed as Record<string, unknown>;
    if (msg.type !== "AUTH" || typeof msg.token !== "string" || typeof msg.contestId !== "number") {
      return null;
    }

    return {
      type: "AUTH",
      token: msg.token,
      contestId: msg.contestId,
    };
  } catch {
    return null;
  }
}

export function handleConnection(ws: WebSocket): void {
  const joinedRooms = new Set<number>();
  let isAuthenticated = false;

  const authTimeout = setTimeout(() => {
    if (!isAuthenticated) {
      ws.close();
    }
  }, 10_000);

  ws.once("message", (raw) => {
    const message = parseHandshakeMessage(raw);
    if (!message) {
      ws.send(JSON.stringify({ type: "ERROR", message: "Unauthorized" }));
      ws.close();
      return;
    }

    const claims = verifyToken(message.token);
    if (!claims) {
      ws.send(JSON.stringify({ type: "ERROR", message: "Unauthorized" }));
      ws.close();
      return;
    }

    clearTimeout(authTimeout);
    isAuthenticated = true;
    joinRoom(message.contestId, ws);
    joinedRooms.add(message.contestId);
    ws.send(
      JSON.stringify({
        type: "CONNECTED",
        contestId: message.contestId,
        userId: claims.userId,
      })
    );
  });

  ws.on("close", () => {
    clearTimeout(authTimeout);
    for (const contestId of joinedRooms) {
      leaveRoom(contestId, ws);
    }
    joinedRooms.clear();
  });
}
