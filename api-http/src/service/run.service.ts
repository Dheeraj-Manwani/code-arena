import crypto from "crypto";
import IORedis from "ioredis";
import type { RunCodeSchemaType } from "../schema/submission.schema";
import { enqueueRunJob } from "../lib/judgeQueue";
import { AppError } from "../errors/app-error";
import { generateJudgeBoilerplate, type SerializedTestCase } from "../util/boilerplate";

interface RunJobErrorResult {
  ok: false;
  runId: string;
  error: string;
}

interface RunJobSuccessResult {
  ok: true;
  runId: string;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  status: {
    id: number;
    description: string;
  };
  memory: number | null;
  executionTime: number | null;
}

type RunJobResult = RunJobErrorResult | RunJobSuccessResult;

function parseRunJobResult(message: string): RunJobResult {
  const parsed: unknown = JSON.parse(message);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid run result received from pub/sub");
  }

  const obj = parsed as Record<string, unknown>;
  if (obj.ok === false) {
    if (typeof obj.runId !== "string" || typeof obj.error !== "string") {
      throw new Error("Invalid failure payload received from pub/sub");
    }
    return {
      ok: false,
      runId: obj.runId,
      error: obj.error,
    };
  }

  if (
    obj.ok === true &&
    typeof obj.runId === "string" &&
    obj.status &&
    typeof obj.status === "object"
  ) {
    const status = obj.status as Record<string, unknown>;
    if (typeof status.id !== "number" || typeof status.description !== "string") {
      throw new Error("Invalid status payload received from pub/sub");
    }
    return {
      ok: true,
      runId: obj.runId,
      stdout: typeof obj.stdout === "string" || obj.stdout === null ? obj.stdout : null,
      stderr: typeof obj.stderr === "string" || obj.stderr === null ? obj.stderr : null,
      compileOutput:
        typeof obj.compileOutput === "string" || obj.compileOutput === null ? obj.compileOutput : null,
      status: {
        id: status.id,
        description: status.description,
      },
      memory: typeof obj.memory === "number" || obj.memory === null ? obj.memory : null,
      executionTime:
        typeof obj.executionTime === "number" || obj.executionTime === null ? obj.executionTime : null,
    };
  }

  throw new Error("Unknown run payload received from pub/sub");
}

export const runCode = async (data: RunCodeSchemaType) => {
  const { code, language, signature, testCases } = data;

  let sourceCode = code;
  if (signature && testCases && testCases.length > 0) {
    const serialized: SerializedTestCase[] = testCases.map((tc) => ({
      input: tc.input,
      expectedOutput: tc.expectedOutput,
    }));
    const harnesses = generateJudgeBoilerplate(signature, code, serialized);
    sourceCode = harnesses[language];
  }

  const responseChannel = `judge:run:result:${Date.now()}:${crypto.randomUUID()}`;
  const subscriber = new IORedis({
    host: process.env.REDIS_HOST ?? "localhost",
    port: Number.parseInt(process.env.REDIS_PORT ?? "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  let timeoutRef: NodeJS.Timeout | undefined;

  try {
    const waitForResultPromise = new Promise<RunJobResult>((resolve, reject) => {
      const handleMessage = (channel: string, message: string) => {
        if (channel !== responseChannel) {
          return;
        }

        try {
          const result = parseRunJobResult(message);
          subscriber.off("message", handleMessage);
          resolve(result);
        } catch (error) {
          subscriber.off("message", handleMessage);
          reject(
            error instanceof Error
              ? error
              : new Error("Invalid run result received from pub/sub")
          );
        }
      };

      subscriber.on("message", handleMessage);
    });

    await subscriber.subscribe(responseChannel);
    await enqueueRunJob({
      language,
      sourceCode,
      responseChannel,
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutRef = setTimeout(() => {
        reject(new Error("Run request timed out waiting for judge-worker response"));
      }, 35_000);
    });

    const result = await Promise.race([waitForResultPromise, timeoutPromise]);

    if (result.ok === false) {
      throw new AppError(result.error, 502, "RUN_EXECUTION_FAILED");
    }

    return {
      runId: result.runId,
      stdout: result.stdout,
      stderr: result.stderr,
      compileOutput: result.compileOutput,
      status: result.status,
      memory: result.memory,
      executionTime: result.executionTime,
    };
  } finally {
    if (timeoutRef) {
      clearTimeout(timeoutRef);
    }
    await subscriber.quit();
  }
};