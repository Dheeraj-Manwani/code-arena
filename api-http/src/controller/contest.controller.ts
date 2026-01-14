import { Response } from "express";
import { AuthRequest } from "../types/express.d";
import * as contestService from "../service/contest.service";
import { sendSuccess } from "../util/response";
import {
  CreateContestSchema,
  AddMcqSchema,
  AddDsaSchema,
} from "../schema/contest.schema";
import { ContestNotFoundError } from "../errors/contest.errors";

export const createContest = async (req: AuthRequest, res: Response) => {
  const data = CreateContestSchema.parse(req.body);
  const contest = await contestService.createContest(data, req.userId!);
  return sendSuccess(res, contest, 201);
};

export const getContestById = async (req: AuthRequest, res: Response) => {
  const contestId = parseInt(String(req.params.contestId));
  if (isNaN(contestId)) {
    throw new ContestNotFoundError();
  }
  const contest = await contestService.getContestById(contestId);
  return sendSuccess(res, contest, 200);
};

export const addMcq = async (req: AuthRequest, res: Response) => {
  const contestId = parseInt(String(req.params.contestId));
  if (isNaN(contestId)) {
    throw new ContestNotFoundError();
  }
  const data = AddMcqSchema.parse(req.body);
  const mcq = await contestService.addMcqToContest(contestId, data);
  return sendSuccess(res, mcq, 201);
};

export const addDsa = async (req: AuthRequest, res: Response) => {
  const contestId = parseInt(String(req.params.contestId));
  if (isNaN(contestId)) {
    throw new ContestNotFoundError();
  }
  const data = AddDsaSchema.parse(req.body);
  const dsaProblem = await contestService.addDsaToContest(contestId, data);
  return sendSuccess(res, dsaProblem, 201);
};
