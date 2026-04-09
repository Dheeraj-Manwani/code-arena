import IORedis from "ioredis";

export const redisConnection = new IORedis({
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number.parseInt(process.env.REDIS_PORT ?? "6379", 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});
