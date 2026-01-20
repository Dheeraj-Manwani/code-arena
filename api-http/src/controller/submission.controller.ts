import { Request, Response } from "express";
import * as submissionService from "../service/submission.service";
import { sendSuccess } from "../util/response";
import { SubmitMcqSchema, SubmitDsaSchema } from "../schema/submission.schema";

export const submitMcq = async (req: Request, res: Response) => {
  const contestId = parseInt(String(req.params.contestId));
  const questionId = parseInt(String(req.params.questionId));
  const data = SubmitMcqSchema.parse(req.body);
  const result = await submissionService.submitMcq(
    contestId,
    questionId,
    req.userId,
    data
  );
  return sendSuccess(res, result, 201);
};

export const submitDsa = async (req: Request, res: Response) => {
  const problemId = parseInt(String(req.params.problemId));
  const data = SubmitDsaSchema.parse(req.body);
  const result = await submissionService.submitDsa(
    problemId,
    req.userId,
    data
  );
  return sendSuccess(res, result, 201);
};
