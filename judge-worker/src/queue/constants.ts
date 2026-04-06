export const QUEUE_NAME = "judge";
export const JOB_NAME = "dsa-submission";
export const RUN_QUEUE_NAME = "judge-run";
export const RUN_JOB_NAME = "dsa-run";

export const POLL_MAX_ATTEMPTS = 20;
export const POLL_INTERVAL_MS = 1500;
export const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY ?? "4", 10);

// TODO: CHECK IF THIS IS USED ANYWHERE ELSE
export const JUDGE0_LANGUAGE_MAP: Record<string, number> = {
  cpp: 54,
  python: 71,
  javascript: 63,
  java: 62,
};

export const JUDGE0_TERMINAL_STATUSES = new Set([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
