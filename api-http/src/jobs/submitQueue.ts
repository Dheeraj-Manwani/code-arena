import crypto from "crypto";
import { submitPool } from "./pool";
import { LANGUAGE_TO_JUDGE_JOB } from "./constants";
import { generateJudgeBoilerplate, type SerializedTestCase } from "../util/boilerplate";
import type { BoilerplateSignature } from "../util/boilerplate/types";
import type { Language } from "../schema/language.schema";
import type { JudgeJob, JudgeTarget } from "../schema/job.schema";

/**
 * Build a JudgeJob (harness + language mapping) and hand it to the in-process
 * pool (Economy Service Phase 3). Replaces the old `enqueueJudgeJob`, which
 * serialized the job onto the BullMQ/Redis `judge` queue.
 *
 * `target` decides which table the verdict lands in and whether the job gets
 * contest priority in the pool (PRACTICE_MODE_AND_NAVIGATION.md §4.1/§4.3).
 */
export interface EnqueueSubmitJobParams {
  target: JudgeTarget;
  userId: number;
  problemId: number;
  language: Language;
  userCode: string;
  signature: BoilerplateSignature;
  testCases: SerializedTestCase[];
  totalPoints: number;
}

export function enqueueSubmitJob(params: EnqueueSubmitJobParams): string {
  const allHarnesses = generateJudgeBoilerplate(params.signature, params.userCode, params.testCases);
  const sourceCode = allHarnesses[params.language];

  const job: JudgeJob = {
    jobId: crypto.randomUUID(),
    target: params.target,
    userId: params.userId,
    problemId: params.problemId,
    language: LANGUAGE_TO_JUDGE_JOB[params.language],
    sourceCode,
    totalTestCases: params.testCases.length,
    totalPoints: params.totalPoints,
  };

  submitPool.enqueue(job);
  return job.jobId;
}
