import type http from "http";
import { WebSocketServer } from "ws";
import { logger } from "../lib/logger";
import { handleConnection } from "./connection";
import { publishSubmissionResult } from "./publisher";
import { allClients } from "./clients";
import { bus } from "./bus";

/**
 * Attach the WebSocket server to the shared HTTP server (Economy Service Phase 4).
 *
 * One process, one port: the `ws` server no longer binds its own port — it
 * upgrades HTTP connections on the same `http.Server` Express listens on.
 * Auth stays message-based (the client sends an AUTH frame first, verified in
 * connection.ts), so the upgrade handler accepts the socket and hands it off.
 *
 * It is still fed by the in-process `bus` (Phase 2), not a Redis subscription.
 */
export function attachRealtime(server: http.Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws) => {
    handleConnection(ws);
  });

  // §8.3 heartbeat + §8.4 mid-connection JWT re-check. Every cycle we (1) close any
  // socket whose access token has since expired, (2) terminate sockets that missed
  // the previous ping's pong (half-open/dead — reaped from rooms via their close
  // handler), and (3) ping the rest. `isAlive` is reset here and set again on pong.
  const HEARTBEAT_INTERVAL_MS = 30_000;
  const heartbeat = setInterval(() => {
    const now = Date.now();
    for (const [ws, state] of allClients()) {
      if (state.tokenExp * 1000 <= now) {
        ws.close(4001, "Token expired");
        continue;
      }
      if (!state.isAlive) {
        ws.terminate();
        continue;
      }
      state.isAlive = false;
      ws.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);

  wss.on("close", () => {
    clearInterval(heartbeat);
  });

  // The judge processor emits on the bus; we broadcast (Phase 2).
  bus.on("submission_result", (event) => {
    publishSubmissionResult(event);
  });

  logger.info("realtime WebSocket server attached to HTTP server");
  return wss;
}
