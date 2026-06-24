import { env } from "./env"; // validates environment at startup (also loads dotenv) — must be first
import IORedis from "ioredis";
import pino from "pino";
import { WebSocketServer } from "ws";
import { handleConnection } from "./connection";
import { publishSubmissionResult } from "./publisher";

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
