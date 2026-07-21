import { Response } from "express";
import { AuthRequest } from "../types/express.d";
import * as problemService from "../service/problem.service";
import { sendSuccess } from "../util/response";
import { ProblemNotFoundError } from "../errors/problem.errors";
import { AddMcqSchema, AddDsaSchema, UpdateMcqSchema, UpdateDsaSchema, GetProblemsSchema } from "../schema/problem.schema";
import { generateUserBoilerplate, toStoredSignature } from "../util/boilerplate";
import type { BoilerplateSignature } from "../util/boilerplate";

/** GET /api/problems — the public practice catalogue. */
export const getPracticeProblems = async (req: AuthRequest, res: Response) => {
  const query = GetProblemsSchema.parse(req.query);
  const result = await problemService.getPracticeProblems(query, req.userId);
  return sendSuccess(res, result, 200);
};

/** GET /api/problems/tags — distinct tags, for the catalogue filter. */
export const getPracticeTags = async (_req: AuthRequest, res: Response) => {
  const tags = await problemService.getPracticeTags();
  return sendSuccess(res, tags, 200);
};

/** GET /api/problems/:slug — a single practiceable problem. */
export const getPracticeProblemBySlug = async (req: AuthRequest, res: Response) => {
  const slug = String(req.params.slug ?? "").trim();
  if (!slug) {
    throw new ProblemNotFoundError();
  }
  const problem = await problemService.getPracticeProblemBySlug(slug, req.userId);
  return sendSuccess(res, problem, 200);
};

export const getAllMcqQuestions = async (req: AuthRequest, res: Response) => {
  const page = parseInt(String(req.query.page)) || 1;
  const limit = parseInt(String(req.query.limit)) || 10;
  const search = String(req.query.search || "").trim();
  const result = await problemService.getAllMcqQuestions(page, limit, search);
  return sendSuccess(res, result, 200);
};

export const getAllDsaProblems = async (req: AuthRequest, res: Response) => {
  const page = parseInt(String(req.query.page)) || 1;
  const limit = parseInt(String(req.query.limit)) || 10;
  const search = String(req.query.search || "").trim();
  const result = await problemService.getAllDsaProblems(page, limit, search);
  return sendSuccess(res, result, 200);
};

export const createMcqQuestion = async (req: AuthRequest, res: Response) => {
  const data = AddMcqSchema.parse(req.body);
  const mcq = await problemService.createStandaloneMcqQuestion(data, req.userId);
  return sendSuccess(res, mcq, 201);
};

export const createDsaProblem = async (req: AuthRequest, res: Response) => {
  const data = AddDsaSchema.parse(req.body);
  if (data.boilerplateSignature == null) {
    throw new Error("boilerplateSignature is required for DSA problems");
  }
  const signature = toStoredSignature(data.boilerplateSignature);

  const dsaProblem = await problemService.createStandaloneDsaProblem(
    {
      title: data.title,
      description: data.description,
      tags: data.tags,
      points: data.points,
      timeLimit: data.timeLimit,
      memoryLimit: data.memoryLimit,
      difficulty: data.difficulty,
      // Undefined falls through to the schema default (`draft`), so a client
      // that omits it never accidentally publishes to the catalogue.
      visibility: data.visibility,
      maxDurationMs: data.maxDurationMs,
      signature,
      inputFormat: data.inputFormat ?? null,
      outputFormat: data.outputFormat ?? null,
      constraints: data.constraints ?? [],
    },
    data.testCases,
    req.userId
  );
  return sendSuccess(res, dsaProblem, 201);
};

export const updateMcqQuestion = async (req: AuthRequest, res: Response) => {
  const questionId = parseInt(String(req.params.questionId));
  if (isNaN(questionId)) {
    throw new ProblemNotFoundError();
  }
  const data = UpdateMcqSchema.parse(req.body);
  const mcq = await problemService.updateMcqQuestion(questionId, data, req.userId);
  return sendSuccess(res, mcq, 200);
};

export const updateDsaProblem = async (req: AuthRequest, res: Response) => {
  const problemId = parseInt(String(req.params.problemId));
  if (isNaN(problemId)) {
    throw new ProblemNotFoundError();
  }
  const data = UpdateDsaSchema.parse(req.body);
  const updatePayload: Record<string, unknown> = {
    title: data.title,
    description: data.description,
    tags: data.tags,
    points: data.points,
    timeLimit: data.timeLimit,
    memoryLimit: data.memoryLimit,
    difficulty: data.difficulty,
    visibility: data.visibility,
    maxDurationMs: data.maxDurationMs,
  };

  if (data.boilerplateSignature != null) {
    updatePayload.signature = toStoredSignature(data.boilerplateSignature);
  }
  if (data.inputFormat !== undefined) updatePayload.inputFormat = data.inputFormat;
  if (data.outputFormat !== undefined) updatePayload.outputFormat = data.outputFormat;
  if (data.constraints !== undefined) updatePayload.constraints = data.constraints;

  const dsaProblem = await problemService.updateDsaProblem(
    problemId,
    updatePayload,
    data.testCases,
    req.userId
  );
  return sendSuccess(res, dsaProblem, 200);
};

export const getMcqQuestionById = async (req: AuthRequest, res: Response) => {
  const questionId = parseInt(String(req.params.questionId));
  if (isNaN(questionId)) {
    throw new ProblemNotFoundError();
  }
  const question = await problemService.getMcqQuestionById(questionId);
  return sendSuccess(res, question, 200);
};

/** Derive boilerplate from stored signature for API response (never stored). */
function withDerivedBoilerplate<T extends { signature: unknown }>(row: T) {
  const sig = row.signature as BoilerplateSignature | null;
  const boilerplate =
    sig && typeof sig === "object" && "functionName" in sig
      ? generateUserBoilerplate(sig as BoilerplateSignature)
      : {};
  return { ...row, boilerplate };
}

export const getDsaProblemById = async (req: AuthRequest, res: Response) => {
  const problemId = parseInt(String(req.params.problemId));
  if (isNaN(problemId)) {
    throw new ProblemNotFoundError();
  }
  const problem = await problemService.getDsaProblemById(problemId);
  return sendSuccess(res, withDerivedBoilerplate(problem), 200);
};