import { env } from "./env"; // validates environment at startup (also loads dotenv) — must be first
import IORedis from "ioredis";
import pino from "pino";
import { WebSocketServer } from "ws";
import { handleConnection } from "./connection";
import { publishSubmissionResult } from "./publisher";
import { allClients } from "./clients";

const logger = pino({
  transport:
    env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
        }
      : undefined,
});

const wsPort = env.WS_PORT;
const wss = new WebSocketServer({ port: wsPort });

wss.on("connection", (ws) => {
  handleConnection(ws);
});

// §8.3 heartbeat + §8.4 mid-connection JWT re-check. Every cycle we (1) close any
// socket whose access token has since expired, (2) terminate sockets that missed the
// previous ping's pong (half-open/dead — they get reaped from rooms via their close
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

const subscriber = new IORedis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

subscriber.on("pmessage", (_pattern, _channel, message) => {
  try {
    const parsed: unknown = JSON.parse(message);
    if (!parsed || typeof parsed !== "object") {
      return;
    }

    const payload = parsed as Record<string, unknown>;
    if (
      payload.type !== "SUBMISSION_RESULT" ||
      typeof payload.contestId !== "number" ||
      typeof payload.userId !== "number"
    ) {
      return;
    }

    publishSubmissionResult(payload as {
      type: "SUBMISSION_RESULT";
      contestId: number;
      userId: number;
    });
  } catch (error) {
    logger.warn({ error }, "Failed to parse pub/sub payload");
  }
});

void (async () => {
  await subscriber.psubscribe("contest:*:submission");
  logger.info({ wsPort }, "realtime-gateway started");
})();
