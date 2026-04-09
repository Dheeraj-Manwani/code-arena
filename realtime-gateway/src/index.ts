import "dotenv/config";
import IORedis from "ioredis";
import pino from "pino";
import { WebSocketServer } from "ws";
import { handleConnection } from "./connection";
import { publishSubmissionResult } from "./publisher";

const logger = pino({
  transport:
    process.env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
        }
      : undefined,
});

const wsPort = Number.parseInt(process.env.WS_PORT ?? "8080", 10);
const wss = new WebSocketServer({ port: wsPort });

wss.on("connection", (ws) => {
  handleConnection(ws);
});

const subscriber = new IORedis({
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number.parseInt(process.env.REDIS_PORT ?? "6379", 10),
  password: process.env.REDIS_PASSWORD || undefined,
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
    if (payload.type !== "SUBMISSION_RESULT" || typeof payload.contestId !== "number") {
      return;
    }

    publishSubmissionResult(payload as {
      type: "SUBMISSION_RESULT";
      contestId: number;
    });
  } catch (error) {
    logger.warn({ error }, "Failed to parse pub/sub payload");
  }
});

void (async () => {
  await subscriber.psubscribe("contest:*:submission");
  logger.info({ wsPort }, "realtime-gateway started");
})();
