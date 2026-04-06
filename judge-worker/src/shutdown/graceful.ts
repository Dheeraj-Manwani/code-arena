import type { Worker } from "bullmq";
import { connection } from "../queue/connection";
import { logger } from "../logger";

export function registerGracefulShutdown(workers: Worker[]): void {
  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutdown signal received");

    const hardKillTimer = setTimeout(() => {
      logger.error("Graceful shutdown timed out, forcing exit");
      process.exit(1);
    }, 30_000);
    hardKillTimer.unref();

    try {
      await Promise.all(workers.map((worker) => worker.close()));
      logger.info({ workerCount: workers.length }, "Workers closed");
    } catch (err) {
      logger.error({ err }, "Error closing workers");
    }

    try {
      await connection.quit();
      logger.info("Redis connection closed");
    } catch (err) {
      logger.error({ err }, "Error closing Redis connection");
    }

    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
