import WebSocket from "ws";
import { verifyToken } from "./auth";
import { joinRoom, leaveRoom, joinUserRoom, leaveUserRoom } from "./rooms";
import { setClientState, getClientState, deleteClientState } from "./clients";

interface AuthHandshakeMessage {
  type: "AUTH";
  token: string;
  /**
   * Optional: present when the client is watching a contest. Practice clients
   * omit it and rely on their user room alone (§4.2).
   */
  contestId?: number;
}

function parseHandshakeMessage(raw: WebSocket.RawData): AuthHandshakeMessage | null {
  try {
    const text = typeof raw === "string" ? raw : raw.toString();
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const msg = parsed as Record<string, unknown>;
    if (msg.type !== "AUTH" || typeof msg.token !== "string") {
      return null;
    }
    // Present-but-not-a-number is a malformed frame, not a practice client.
    if (msg.contestId !== undefined && typeof msg.contestId !== "number") {
      return null;
    }

    return {
      type: "AUTH",
      token: msg.token,
      contestId: msg.contestId as number | undefined,
    };
  } catch {
    return null;
  }
}

/** Ported unchanged from realtime-gateway (issues.md §8.2/§8.3). */
export function handleConnection(ws: WebSocket): void {
  // Close the socket if it never authenticates.
  const authTimeout = setTimeout(() => {
    if (!getClientState(ws)) {
      ws.close();
    }
  }, 10_000);

  // §8.2: a real message router (ws.on, not ws.once) so a socket can (re-)auth and
  // join additional rooms over its lifetime instead of being locked to one message.
  ws.on("message", (raw) => {
    const message = parseHandshakeMessage(raw);
    if (!message) {
      // Unknown frame: reject only if the socket hasn't authenticated yet.
      if (!getClientState(ws)) {
        ws.send(JSON.stringify({ type: "ERROR", message: "Unauthorized" }));
        ws.close();
      }
      return;
    }

    const claims = verifyToken(message.token);
    if (!claims) {
      ws.send(JSON.stringify({ type: "ERROR", message: "Unauthorized" }));
      ws.close();
      return;
    }

    clearTimeout(authTimeout);

    let state = getClientState(ws);
    if (!state) {
      state = { userId: claims.userId, tokenExp: claims.exp, isAlive: true, rooms: new Set() };
      setClientState(ws, state);
      joinUserRoom(claims.userId, ws);
    } else {
      // Re-auth on an existing socket (e.g. refreshed token) — update the claims.
      // If it authenticated as a different user, move it to that user's room so
      // it can't keep receiving the previous user's results.
      if (state.userId !== claims.userId) {
        leaveUserRoom(state.userId, ws);
        joinUserRoom(claims.userId, ws);
        state.userId = claims.userId;
      }
      state.tokenExp = claims.exp;
    }

    if (message.contestId !== undefined && !state.rooms.has(message.contestId)) {
      joinRoom(message.contestId, ws);
      state.rooms.add(message.contestId);
    }

    ws.send(
      JSON.stringify({
        type: "CONNECTED",
        contestId: message.contestId ?? null,
        userId: claims.userId,
      })
    );
  });

  // §8.3: heartbeat — a pong marks the socket alive for the next ping cycle.
  ws.on("pong", () => {
    const state = getClientState(ws);
    if (state) {
      state.isAlive = true;
    }
  });

  ws.on("close", () => {
    clearTimeout(authTimeout);
    const state = getClientState(ws);
    if (state) {
      for (const contestId of state.rooms) {
        leaveRoom(contestId, ws);
      }
      leaveUserRoom(state.userId, ws);
    }
    deleteClientState(ws);
  });
}
