import { z } from "zod";

export interface RunJob {
  runId: string;
  language: "cpp" | "python" | "javascript" | "java";
  sourceCode: string;
  responseChannel: string;
}

const runJobSchema = z.object({
  runId: z.string(),
  language: z.enum(["cpp", "python", "javascript", "java"]),
  sourceCode: z.string(),
  responseChannel: z.string(),
});

export function parseRunJob(data: unknown): RunJob {
  return runJobSchema.parse(data);
}
