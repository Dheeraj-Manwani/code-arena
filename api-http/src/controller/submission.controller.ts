import { Request, Response } from "express";
import * as submissionService from "../service/submission.service";
import { sendSuccess } from "../util/response";
import { SubmitMcqSchema, SubmitDsaSchema } from "../schema/submission.schema";
import { ContestNotFoundError } from "../errors/contest.errors";

export const submitMcq = async (req: Request, res: Response) => {
  const contestId = parseInt(String(req.params.contestId));
  const attemptId = parseInt(String(req.params.attemptId));
  const questionId = parseInt(String(req.params.questionId));
  if (isNaN(contestId) || isNaN(attemptId) || isNaN(questionId)) {
    throw new ContestNotFoundError();
  }
  const data = SubmitMcqSchema.parse(req.body);
  const result = await submissionService.submitMcq(
    contestId,
    attemptId,
    questionId,
    req.userId,
    data
  );
  return sendSuccess(res, result, 201);
};

export const submitDsa = async (req: Request, res: Response) => {
  const contestId = parseInt(String(req.params.contestId));
  const attemptId = parseInt(String(req.params.attemptId));
  const problemId = parseInt(String(req.params.problemId));
  if (isNaN(contestId) || isNaN(attemptId) || isNaN(problemId)) {
    throw new ContestNotFoundError();
  }
  const data = SubmitDsaSchema.parse(req.body);
  const result = await submissionService.submitDsa(
    contestId,
    attemptId,
    problemId,
    req.userId,
    data
  );
  return sendSuccess(res, result, 201);
};

export const createAttempt = async (req: Request, res: Response) => {
  const contestId = parseInt(String(req.params.contestId));
  if (isNaN(contestId)) {
    throw new ContestNotFoundError();
  }
  const attemptId = await submissionService.createAttempt(contestId, req.userId);
  return sendSuccess(res, { attemptId }, 200)
}

export const getContestAttempt = async (req: Request, res: Response) => {
  const contestId = parseInt(String(req.params.contestId));
  const attemptId = parseInt(String(req.params.attemptId));
  if (isNaN(contestId) || isNaN(attemptId)) {
    throw new ContestNotFoundError();
  }
  const attempt = await submissionService.getContestAttempt(
    contestId,
    attemptId,
    req.userRole,
    req.userId,
  );
  return sendSuccess(res, attempt, 200);
};

export const saveMcqDraft = async (req: Request, res: Response) => {
  const contestId = parseInt(String(req.params.contestId));
  const attemptId = parseInt(String(req.params.attemptId));
  const questionId = parseInt(String(req.params.questionId));
  if (isNaN(contestId) || isNaN(attemptId) || isNaN(questionId)) {
    throw new ContestNotFoundError();
  }
  const { selectedOptionIndex } = SubmitMcqSchema.parse(req.body);
  await submissionService.saveMcqDraft(contestId, attemptId, questionId, selectedOptionIndex, req.userId);
  return sendSuccess(res, { success: true }, 200);
};

export const saveDsaDraft = async (req: Request, res: Response) => {
  const contestId = parseInt(String(req.params.contestId));
  const attemptId = parseInt(String(req.params.attemptId));
  const problemId = parseInt(String(req.params.problemId));
  if (isNaN(contestId) || isNaN(attemptId) || isNaN(problemId)) {
    throw new ContestNotFoundError();
  }
  const data = SubmitDsaSchema.parse(req.body);
  await submissionService.saveDsaDraft(contestId, attemptId, problemId, data, req.userId);
  return sendSuccess(res, { success: true }, 200);
};

export const submitContest = async (req: Request, res: Response) => {
  const contestId = parseInt(String(req.params.contestId));
  const attemptId = parseInt(String(req.params.attemptId));
  if (isNaN(contestId) || isNaN(attemptId)) {
    throw new ContestNotFoundError();
  }
  await submissionService.submitContest(contestId, attemptId, req.userId);
  return sendSuccess(res, { success: true }, 200);
};
