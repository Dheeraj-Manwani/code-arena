import "dotenv/config";
import { connection } from "./queue/connection";
import { createWorkers } from "./worker";
import { registerGracefulShutdown } from "./shutdown/graceful";
import { logger } from "./logger";
import { QUEUE_NAME, RUN_QUEUE_NAME, WORKER_CONCURRENCY } from "./queue/constants";

async function main() {
  try {
    await connection.ping();
    logger.info("Redis connection verified");
  } catch (err) {
    logger.fatal({ err }, "Failed to connect to Redis");
    process.exit(1);
  }

  const workers = createWorkers();
  registerGracefulShutdown(workers);

  logger.info(
    {
      queue: QUEUE_NAME,
      runQueue: RUN_QUEUE_NAME,
      concurrency: WORKER_CONCURRENCY,
      nodeEnv: process.env.NODE_ENV ?? "development",
    },
    "Judge worker started"
  );
}

main().catch((err) => {
  logger.fatal({ err }, "Unhandled error during startup");
  process.exit(1);
});
