import { Queue } from "bullmq";
import { redisConnection } from "./redis";

const QUEUE_NAME = "judge";
const RUN_QUEUE_NAME = "judge-run";

export const judgeQueue = new Queue(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 500 },
    removeOnFail: false,
  },
});

export const runQueue = new Queue(RUN_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 500 },
    removeOnFail: false,
  },
});
