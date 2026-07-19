import * as practiceRepo from "../repositories/practice.repository";
import * as problemRepo from "../repositories/problem.repository";
import { ProblemNotFoundError } from "../errors/problem.errors";
import { enqueueSubmitJob } from "../jobs/submitQueue";
import type { SubmitDsaSchemaType } from "../schema/submission.schema";
import type { Language } from "../schema/language.schema";
import type { BoilerplateSignature } from "../util/boilerplate/types";
import type { SerializedTestCase } from "../util/boilerplate";

/** Max submission rows returned for a problem's history panel. */
const HISTORY_LIMIT = 20;

/**
 * Resolve a slug to a problem the caller is allowed to practise, with the data
 * the judge needs (signature + ALL test cases, hidden included).
 *
 * The practiceable rule is re-checked here rather than trusted from the read
 * path: a contest could have been published between the page load and the
 * submit, and a submit is exactly when it matters (§4.4).
 */
const getSubmittableProblem = async (slug: string) => {
  const problem = await problemRepo.getPracticeProblemForJudge(slug, new Date());

  if (!problem) {
    throw new ProblemNotFoundError();
  }

  return problem;
};

export const submitPracticeSolution = async (
  slug: string,
  userId: number,
  input: SubmitDsaSchemaType,
) => {
  const { code, language } = input;
  const problem = await getSubmittableProblem(slug);

  const testCases: SerializedTestCase[] = problem.testCases.map((tc) => ({
    input: tc.input,
    expectedOutput: tc.expectedOutput,
  }));

  const submission = await practiceRepo.createPracticeSubmission({
    userId,
    problemId: problem.id,
    code,
    language,
    totalTestCases: testCases.length,
  });

  enqueueSubmitJob({
    target: { kind: "practice", practiceSubmissionId: submission.id },
    userId,
    problemId: problem.id,
    language: language as Language,
    userCode: code,
    signature: problem.signature as unknown as BoilerplateSignature,
    testCases,
    // Practice is unscored; the judge still needs a number here and the result
    // path drops it (see practice.repository#applyPracticeVerdict).
    totalPoints: problem.points,
  });

  return {
    practiceSubmissionId: submission.id,
    problemId: problem.id,
    status: "pending" as const,
    testCasesPassed: 0,
    totalTestCases: testCases.length,
  };
};

export const getPracticeSubmission = async (
  practiceSubmissionId: number,
  userId: number,
) => {
  // Scoped to the caller: a submission id must never reveal someone else's code.
  const submission = await practiceRepo.getPracticeSubmissionById(
    practiceSubmissionId,
    userId,
  );

  if (!submission) {
    throw new ProblemNotFoundError();
  }

  return {
    ...submission,
    submittedAt: submission.submittedAt.toISOString(),
  };
};

export const getPracticeHistory = async (slug: string, userId: number) => {
  const problem = await getSubmittableProblem(slug);

  const submissions = await practiceRepo.getPracticeSubmissionsForProblem(
    userId,
    problem.id,
    HISTORY_LIMIT,
  );

  return submissions.map((submission) => ({
    ...submission,
    submittedAt: submission.submittedAt.toISOString(),
  }));
};

export const getPracticeDraft = async (slug: string, userId: number) => {
  const problem = await getSubmittableProblem(slug);
  const draft = await practiceRepo.getPracticeDraft(userId, problem.id);

  if (!draft) {
    return null;
  }

  return { code: draft.code, language: draft.language };
};

export const savePracticeDraft = async (
  slug: string,
  userId: number,
  data: { code: string; language: string },
) => {
  const problem = await getSubmittableProblem(slug);

  await practiceRepo.upsertPracticeDraft({
    userId,
    problemId: problem.id,
    code: data.code,
    language: data.language,
  });
};
