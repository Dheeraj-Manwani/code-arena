import { Request, Response } from "express";
import * as contestService from "../service/contest.service";
import { sendSuccess } from "../util/response";
import {
  CreateContestSchema,
  UpdateContestSchema,
  AddMcqSchema,
  AddDsaSchema,
} from "../schema/contest.schema";
import { ContestNotFoundError } from "../errors/contest.errors";

export const getAllContests = async (req: Request, res: Response) => {
  const page = parseInt(String(req.query.page)) || 1;
  const limit = parseInt(String(req.query.limit)) || 10;
  const search = String(req.query.search || "").trim() || undefined;
  const status = String(req.query.status || "").trim() || undefined;
  const sortBy = String(req.query.sortBy || "").trim() || undefined;
  const contests = await contestService.getAllContests(
    page,
    limit,
    req.userRole,
    search,
    status,
    sortBy
  );
  return sendSuccess(res, contests, 200);
};

export const createContest = async (req: Request, res: Response) => {
  const data = CreateContestSchema.parse(req.body);
  const contest = await contestService.createContest(data, req.userId);
  return sendSuccess(res, contest, 201);
};

export const getContestById = async (req: Request, res: Response) => {
  const contestId = parseInt(String(req.params.contestId));
  if (isNaN(contestId)) {
    throw new ContestNotFoundError();
  }
  const includeQuestions = req.query.includeQuestions === "true";
  const contest = await contestService.getContestById(contestId, includeQuestions);
  return sendSuccess(res, contest, 200);
};

export const addMcq = async (req: Request, res: Response) => {
  const contestId = parseInt(String(req.params.contestId));
  if (isNaN(contestId)) {
    throw new ContestNotFoundError();
  }
  const data = AddMcqSchema.parse(req.body);
  const mcq = await contestService.addMcqToContest(contestId, data, req.userId);
  return sendSuccess(res, mcq, 201);
};

export const addDsa = async (req: Request, res: Response) => {
  const contestId = parseInt(String(req.params.contestId));
  if (isNaN(contestId)) {
    throw new ContestNotFoundError();
  }
  const data = AddDsaSchema.parse(req.body);
  const dsaProblem = await contestService.addDsaToContest(contestId, data, req.userId);
  return sendSuccess(res, dsaProblem, 201);
};

export const updateContest = async (req: Request, res: Response) => {
  const contestId = parseInt(String(req.params.contestId));
  if (isNaN(contestId)) {
    throw new ContestNotFoundError();
  }
  const data = UpdateContestSchema.parse(req.body);
  const contest = await contestService.updateContest(
    contestId,
    data,

  );
  return sendSuccess(res, contest, 200);
};

export const linkMcqToContest = async (req: Request, res: Response) => {
  const contestId = parseInt(String(req.params.contestId));
  if (isNaN(contestId)) {
    throw new ContestNotFoundError();
  }
  const questionId = parseInt(String(req.body.questionId));
  const order = parseInt(String(req.body.order || 0));
  if (isNaN(questionId)) {
    return res.status(400).json({ error: "Invalid question ID" });
  }
  const link = await contestService.linkMcqToContest(contestId, questionId, order);
  return sendSuccess(res, link, 200);
};

export const linkDsaToContest = async (req: Request, res: Response) => {
  const contestId = parseInt(String(req.params.contestId));
  if (isNaN(contestId)) {
    throw new ContestNotFoundError();
  }
  const problemId = parseInt(String(req.body.problemId));
  const order = parseInt(String(req.body.order || 0));
  if (isNaN(problemId)) {
    return res.status(400).json({ error: "Invalid problem ID" });
  }
  const link = await contestService.linkDsaToContest(contestId, problemId, order);
  return sendSuccess(res, link, 200);
};

export const unlinkMcqFromContest = async (req: Request, res: Response) => {
  const contestId = parseInt(String(req.params.contestId));
  const questionId = parseInt(String(req.params.questionId));
  if (isNaN(contestId) || isNaN(questionId)) {
    throw new ContestNotFoundError();
  }
  await contestService.unlinkMcqFromContest(contestId, questionId);
  return sendSuccess(res, { success: true }, 200);
};

export const unlinkDsaFromContest = async (req: Request, res: Response) => {
  const contestId = parseInt(String(req.params.contestId));
  const problemId = parseInt(String(req.params.problemId));
  if (isNaN(contestId) || isNaN(problemId)) {
    throw new ContestNotFoundError();
  }
  await contestService.unlinkDsaFromContest(contestId, problemId);
  return sendSuccess(res, { success: true }, 200);
};

export const reorderContestQuestions = async (req: Request, res: Response) => {
  const contestId = parseInt(String(req.params.contestId));
  if (isNaN(contestId)) {
    throw new ContestNotFoundError();
  }
  const { questionOrders } = req.body;
  if (!Array.isArray(questionOrders)) {
    return res.status(400).json({ error: "questionOrders must be an array" });
  }
  await contestService.reorderContestQuestions(contestId, questionOrders);
  return sendSuccess(res, { success: true }, 200);
};