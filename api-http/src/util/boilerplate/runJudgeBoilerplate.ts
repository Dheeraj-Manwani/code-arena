/**
 * Run this to log judge boilerplate for a DSA submission.
 * Set DSA_SUBMISSION_ID below, then: pnpm run judge-boilerplate
 * All Prisma access is in this file only.
 * Outputs Judge0 submission format: { language_id, source_code, stdin }.
 */

import prisma from "../../lib/db";
import {
  LANGUAGES,
  LANGUAGE_CONFIG,
  type Language,
} from "../../schema/language.schema";
import type { BoilerplateSignature } from "./types";
import type { SerializedTestCase } from "./judgeBoilerplate";
import { generateJudgeBoilerplate } from "./judgeBoilerplate";

/** Set this to the DSA submission id to fetch problem signature, test cases, and code. */
const DSA_SUBMISSION_ID = 16;

function toLanguage(s: string): Language | null {
  return LANGUAGES.includes(s as Language) ? (s as Language) : null;
}

async function main() {
  const submission = await prisma.dsaSubmission.findUnique({
    where: { id: DSA_SUBMISSION_ID },
    include: {
      problem: {
        select: { signature: true, testCases: { select: { input: true, expectedOutput: true } } },
      },
    },
  });

  if (!submission) {
    console.error(`DSA submission not found: id=${DSA_SUBMISSION_ID}`);
    process.exit(1);
  }

  if (!submission.problem) {
    console.error("Submission has no linked problem.");
    process.exit(1);
  }

  const lang = toLanguage(submission.language);
  if (!lang) {
    console.error(`Unsupported submission language: ${submission.language}`);
    process.exit(1);
  }

  const signature = submission.problem.signature as BoilerplateSignature | null;
  if (!signature || typeof signature !== "object" || !signature.functionName) {
    console.error("Problem has no valid boilerplate signature.");
    process.exit(1);
  }

  const testCases: SerializedTestCase[] = submission.problem.testCases.map((tc) => ({
    input: tc.input,
    expectedOutput: tc.expectedOutput,
  }));

  if (testCases.length === 0) {
    console.error("Problem has no test cases.");
    process.exit(1);
  }

  const result = generateJudgeBoilerplate(
    signature,
    submission.code,
    testCases
  );

  const language_id = LANGUAGE_CONFIG[lang].id;
  const source_code = result[lang];

  const judge0Payload = {
    language_id,
    source_code,
    stdin: "",
  };

  console.log(JSON.stringify(judge0Payload, null, 2));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
