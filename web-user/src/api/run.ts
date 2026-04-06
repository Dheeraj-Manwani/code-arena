import api from "@/lib/axios";
import type { RunCodeBodySchemaType } from "@/schema/submission.schema";

export type RunCodeApiResult = {
  runId: string;
  ok?: boolean;
  token?: string;
  status?: { id: number; description: string };
  stdout?: string | null;
  stderr?: string | null;
  compileOutput?: string | null;
  memory?: number | null;
  executionTime?: number | null;
};

export const runApi = {
  runCode: async (data: RunCodeBodySchemaType): Promise<RunCodeApiResult> => {
    const res = await api.post<{
      success: boolean;
      data: RunCodeApiResult;
      error: string | null;
    }>("/api/run", data);
    return res.data.data;
  },
};
