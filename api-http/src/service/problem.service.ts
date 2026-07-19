import * as problemRepo from "../repositories/problem.repository";
import { ProblemNotFoundError } from "../errors/problem.errors";
import { generateUserBoilerplate } from "../util/boilerplate";
import type { BoilerplateSignature } from "../util/boilerplate";
import type { GetProblemsQuery } from "../schema/problem.schema";

/** Public practice catalogue, paginated. Stats and status are per-caller. */
export const getPracticeProblems = async (query: GetProblemsQuery, userId: number) => {
  const { problems, totalItems } = await problemRepo.getPracticeProblems(
    query,
    userId,
    new Date(),
  );

  const totalPages = Math.ceil(totalItems / query.limit);

  return {
    problems: problems.map(({ stat, userStatuses, createdAt, ...rest }) => ({
      ...rest,
      createdAt: createdAt.toISOString(),
      acceptanceRate: stat?.acceptanceRate ?? 0,
      solvedBy: stat?.solvedBy ?? 0,
      totalSubmissions: stat?.totalSubmissions ?? 0,
      // Flattened from a `where userId` relation, so this is only ever the
      // caller's own standing. `null` = never attempted.
      status: userStatuses[0]?.status ?? null,
    })),
    meta: {
      totalItems,
      page: query.page,
      limit: query.limit,
      hasNext: query.page < totalPages,
      hasPrev: query.page > 1,
    },
  };
};

export const getPracticeTags = async () => {
  return await problemRepo.getPracticeTags(new Date());
};

/**
 * A practiceable problem by slug. Returns only non-hidden test cases, and
 * derives the editor boilerplate from the stored signature (never stored).
 */
export const getPracticeProblemBySlug = async (slug: string, userId: number) => {
  const problem = await problemRepo.getPracticeProblemBySlug(slug, userId, new Date());

  if (!problem) {
    // A problem that exists but isn't practiceable (draft, contest_only, or held
    // back by a live contest) is a 404, not a 403: revealing that a title exists
    // is exactly the leak §4.4 is about.
    throw new ProblemNotFoundError();
  }

  const { signature, testCases, createdAt, stat, userStatuses, ...rest } = problem;

  const parsedSignature = signature as unknown as BoilerplateSignature | null;
  const hasSignature =
    parsedSignature && typeof parsedSignature === "object" && "functionName" in parsedSignature;

  return {
    ...rest,
    createdAt: createdAt.toISOString(),
    acceptanceRate: stat?.acceptanceRate ?? 0,
    solvedBy: stat?.solvedBy ?? 0,
    totalSubmissions: stat?.totalSubmissions ?? 0,
    status: userStatuses[0]?.status ?? null,
    sampleTestCases: testCases,
    boilerplate: hasSignature ? generateUserBoilerplate(parsedSignature) : {},
    // The client needs the signature to wrap code with the /api/run harness, the
    // same way contest DSA payloads carry it. It describes the function shape
    // (name, params, return type) — no test data, no solution.
    signature: hasSignature ? parsedSignature : null,
  };
};

export const getProblemWithAllTestCases = async (problemId: number) => {
  const problem = await problemRepo.getDsaProblemWithAllTestCases(problemId);

  if (!problem) {
    throw new ProblemNotFoundError();
  }

  return problem;
};

export const getAllMcqQuestions = async (page: number, limit: number, search?: string) => {
  return await problemRepo.getAllMcqQuestions(page, limit, search);
};

export const getAllDsaProblems = async (page: number, limit: number, search?: string) => {
  return await problemRepo.getAllDsaProblems(page, limit, search);
};

// TODO: remove any
export const createStandaloneMcqQuestion = async (data: any, creatorId: number) => {
  return await problemRepo.createStandaloneMcqQuestion({
    ...data,
    creatorId,
  });
};

// TODO: remove any
export const createStandaloneDsaProblem = async (data: any, testCases: any[], creatorId: number) => {
  return await problemRepo.createStandaloneDsaProblem(
    {
      ...data,
      creatorId,
    },
    testCases
  );
};

export const updateMcqQuestion = async (questionId: number, data: any, creatorId: number) => {
  // Verify ownership
  const question = await problemRepo.getMcqQuestionById(questionId);
  if (!question) {
    throw new ProblemNotFoundError();
  }
  if (question.creatorId !== creatorId) {
    throw new ProblemNotFoundError(); // Or create a ForbiddenError
  }

  return await problemRepo.updateMcqQuestion(questionId, data);
};

export const updateDsaProblem = async (problemId: number, data: any, testCases: any[] | undefined, creatorId: number) => {
  // Verify ownership
  const problem = await problemRepo.getDsaProblemById(problemId);
  if (!problem) {
    throw new ProblemNotFoundError();
  }

  return await problemRepo.updateDsaProblem(problemId, data, testCases);
};

export const getMcqQuestionById = async (questionId: number) => {
  const question = await problemRepo.getMcqQuestionById(questionId);
  if (!question) {
    throw new ProblemNotFoundError();
  }
  return question;
};

export const getDsaProblemById = async (problemId: number) => {
  const problem = await problemRepo.getDsaProblemById(problemId);
  if (!problem) {
    throw new ProblemNotFoundError();
  }
  return problem;
};