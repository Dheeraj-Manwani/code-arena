import judge0Client from "./client";
import { JUDGE0_LANGUAGE_MAP } from "../../jobs/constants";
import { UnrecoverableError, JudgeApiError } from "../errors";
import type { JudgeLanguage } from "../../schema/job.schema";
import type { Judge0SubmitRequest, Judge0SubmitResponse } from "../../schema/judge0.schema";

/**
 * Self-Hosted Judge Phase 1: the two public wrappers (`submitToJudge0` /
 * `submitRunToJudge0`) are gone — submit + poll are now composed by
 * `Judge0Executor` behind the `Executor` interface, and both call sites went
 * through the same code path anyway.
 */
export async function submitSourceToJudge0(
  language: JudgeLanguage,
  sourceCode: string
): Promise<string> {
  const languageId = JUDGE0_LANGUAGE_MAP[language];

  if (languageId === undefined) {
    throw new UnrecoverableError(`Unsupported language: ${language}`);
  }

  const body: Judge0SubmitRequest = {
    language_id: languageId,
    source_code: sourceCode,
    stdin: "",
  };

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
