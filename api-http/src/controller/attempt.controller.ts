import { Request, Response } from "express";
import * as attemptService from "../service/attempt.service";
import { sendSuccess } from "../util/response";
import { ListAttemptsQuerySchema } from "../schema/attempt.schema";
import { AttemptNotFoundError } from "../errors/submission.errors";

export const listAttempts = async (req: Request, res: Response) => {
  const { page, limit } = ListAttemptsQuerySchema.parse(req.query);
  const result = await attemptService.getUserAttempts(req.userId, page, limit);
  return sendSuccess(res, result, 200);
};

export const getAttemptResults = async (req: Request, res: Response) => {
  const attemptId = parseInt(String(req.params.attemptId), 10);
  if (isNaN(attemptId)) {
    throw new AttemptNotFoundError();
  }
  const result = await attemptService.getAttemptResults(attemptId, req.userId);
  return sendSuccess(res, result, 200);
};
