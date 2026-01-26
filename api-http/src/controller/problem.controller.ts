import { Response } from "express";
import { AuthRequest } from "../types/express.d";
import * as problemService from "../service/problem.service";
import { sendSuccess } from "../util/response";
import { ProblemNotFoundError } from "../errors/problem.errors";
import { AddMcqSchema, AddDsaSchema, UpdateMcqSchema, UpdateDsaSchema } from "../schema/problem.schema";

export const getProblemById = async (req: AuthRequest, res: Response) => {
  const problemId = parseInt(String(req.params.problemId));
  if (isNaN(problemId)) {
    throw new ProblemNotFoundError();
  }
  const problem = await problemService.getProblemById(problemId);
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
  const dsaProblem = await problemService.createStandaloneDsaProblem(
    {
      title: data.title,
      description: data.description,
      tags: data.tags,
      points: data.points,
      timeLimit: data.timeLimit,
      memoryLimit: data.memoryLimit,
      difficulty: data.difficulty,
      maxDurationMs: data.maxDurationMs,
      boilerplate: data.boilerplate ?? {},
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
    maxDurationMs: data.maxDurationMs,
  };
  if (data.boilerplate !== undefined) updatePayload.boilerplate = data.boilerplate;
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

export const getDsaProblemById = async (req: AuthRequest, res: Response) => {
  const problemId = parseInt(String(req.params.problemId));
  if (isNaN(problemId)) {
    throw new ProblemNotFoundError();
  }
  const problem = await problemService.getDsaProblemById(problemId);
  return sendSuccess(res, problem, 200);
};