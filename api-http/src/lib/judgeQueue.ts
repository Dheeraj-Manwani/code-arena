import crypto from "crypto";
import { judgeQueue, runQueue } from "./queue";
import { generateJudgeBoilerplate, type SerializedTestCase } from "../util/boilerplate";
import type { BoilerplateSignature } from "../util/boilerplate/types";
import type { Language } from "../schema/language.schema";

const JOB_NAME = "dsa-submission";
const RUN_JOB_NAME = "dsa-run";

/** api-http uses "js" internally, but the judge-worker expects "javascript" */
export const LANGUAGE_TO_JUDGE_JOB: Record<Language, "cpp" | "python" | "javascript" | "java"> = {
  cpp: "cpp",
  java: "java",
  js: "javascript",
  python: "python",
};

export interface EnqueueJudgeJobParams {
  dsaSubmissionId: number;
  attemptId: number;
  userId: number;
  problemId: number;
  contestId: number;
  language: Language;
  userCode: string;
  signature: BoilerplateSignature;
  testCases: SerializedTestCase[];
  totalPoints: number;
}

export interface EnqueueRunJobParams {
  language: Language;
  sourceCode: string;
  responseChannel: string;
}

export async function enqueueJudgeJob(params: EnqueueJudgeJobParams): Promise<string> {
  const {
    dsaSubmissionId,
    attemptId,
    userId,
    problemId,
    contestId,
    language,
    userCode,
    signature,
    testCases,
    totalPoints,
  } = params;

  const allHarnesses = generateJudgeBoilerplate(signature, userCode, testCases);
  const sourceCode = allHarnesses[language];

  const judgeLanguage = LANGUAGE_TO_JUDGE_JOB[language];
  const jobId = crypto.randomUUID();

  await judgeQueue.add(
    JOB_NAME,
    {
      jobId,
      dsaSubmissionId,
      attemptId,
      userId,
      problemId,
      contestId,
      language: judgeLanguage,
      sourceCode,
      totalTestCases: testCases.length,
      totalPoints,
    },
    { jobId }
  );

  return jobId;
}

export async function enqueueRunJob(params: EnqueueRunJobParams): Promise<string> {
  const { language, sourceCode, responseChannel } = params;
  const runId = crypto.randomUUID();
  const judgeLanguage = LANGUAGE_TO_JUDGE_JOB[language];

  await runQueue.add(
    RUN_JOB_NAME,
    {
      runId,
      language: judgeLanguage,
      sourceCode,
      responseChannel,
    },
    { jobId: runId }
  );

  return runId;
}
