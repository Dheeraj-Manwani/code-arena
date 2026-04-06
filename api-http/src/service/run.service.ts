import IORedis from "ioredis";
import type { RunCodeBodySchemaType } from "../schema/submission.schema";
import { enqueueRunJob } from "../lib/judgeQueue";
import { AppError } from "../errors/app-error";
import { generateJudgeBoilerplate, type SerializedTestCase } from "../util/boilerplate";
import type { Language } from "../schema/language.schema";

export const runCode = async (data: RunCodeBodySchemaType) => {
  const { code, language, signature, testCases: bodyTestCases } = data;

  let sourceCode = code;
  if (signature && bodyTestCases && bodyTestCases.length > 0) {
    const serialized: SerializedTestCase[] = bodyTestCases.map((tc) => ({
      input: tc.input,
      expectedOutput: tc.expectedOutput,
    }));
    const harnesses = generateJudgeBoilerplate(signature, code, serialized);
    sourceCode = harnesses[language as Language];
  }
  const subscriber = new IORedis({
    host: process.env.REDIS_HOST ?? "localhost",
    port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  const timeoutMs = 35_000;
  let timeout: NodeJS.Timeout | null = null;

  try {
    const responseChannel = `judge:run:result:${Date.now()}:${Math.random().toString(16).slice(2)}`;

    const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
      timeout = setTimeout(() => {
        reject(new Error("Run request timed out waiting for judge-worker response"));
      }, timeoutMs);

      subscriber.on("message", (channel, message) => {
        if (channel !== responseChannel) {
          return;
        }
        try {
          resolve(JSON.parse(message) as Record<string, unknown>);
        } catch {
          reject(new Error("Invalid run result received from pub/sub"));
        }
      });

      void (async () => {
        try {
          // Subscribe before enqueue so we never miss the worker's PUBLISH (race fix).
          await subscriber.subscribe(responseChannel);
          await enqueueRunJob({
            language,
            sourceCode,
            responseChannel,
          });
        } catch (err) {
          reject(
            err instanceof Error
              ? err
              : new Error("Failed to subscribe or enqueue run job")
          );
        }
      })();
    });

    if (result.ok === false) {
      const errMsg =
        typeof result.error === "string" && result.error.length > 0
          ? result.error
          : "Code execution failed";
      throw new AppError(errMsg, 502, "RUN_EXECUTION_FAILED");
    }

    const runId =
      typeof result.runId === "string" ? result.runId : String(result.runId ?? "");

    return {
      runId,
      ...result,
    };
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
    await subscriber.quit();
  }
};