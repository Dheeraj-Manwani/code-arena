import judge0Client from "./client";
import { JUDGE0_LANGUAGE_MAP } from "../queue/constants";
import { UnrecoverableError, JudgeApiError } from "../errors";
import type { JudgeJob } from "../schema/job.schema";
import type { Judge0SubmitRequest, Judge0SubmitResponse } from "../schema/judge0.schema";

async function submitSourceToJudge0(language: string, sourceCode: string): Promise<string> {
  const languageId = JUDGE0_LANGUAGE_MAP[language];

  if (languageId === undefined) {
    throw new UnrecoverableError(`Unsupported language: ${language}`);
  }

  const body: Judge0SubmitRequest = {
    language_id: languageId,
    source_code: sourceCode,
    stdin: "",
  };

  console.log(process.env.JUDGE0_API_URL, "JUDGE0_API_URL");

  const response = await judge0Client
    .post<Judge0SubmitResponse>("/submissions?base64_encoded=false&wait=false", body)
    .catch((err) => {
      if (err.response) {
        throw new JudgeApiError(err.response.status, err.response.data);
      }
      throw err;
    });

  return response.data.token;
}

export async function submitToJudge0(job: JudgeJob): Promise<string> {
  return submitSourceToJudge0(job.language, job.sourceCode);
}

export async function submitRunToJudge0(language: string, sourceCode: string): Promise<string> {
  return submitSourceToJudge0(language, sourceCode);
}
