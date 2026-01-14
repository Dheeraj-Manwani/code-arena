import { Response } from "express";
import { AuthRequest } from "../types/express.d";
import * as problemService from "../service/problem.service";
import { sendSuccess } from "../util/response";
import { ProblemNotFoundError } from "../errors/problem.errors";

export const getProblemById = async (req: AuthRequest, res: Response) => {
  const problemId = parseInt(String(req.params.problemId));
  if (isNaN(problemId)) {
    throw new ProblemNotFoundError();
  }
  const problem = await problemService.getProblemById(problemId);
  return sendSuccess(res, problem, 200);
};
