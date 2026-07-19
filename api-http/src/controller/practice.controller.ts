import { Response } from "express";
import { AuthRequest } from "../types/express.d";
import * as practiceService from "../service/practice.service";
import { sendSuccess } from "../util/response";
import { SubmitDsaSchema } from "../schema/submission.schema";
import { ProblemNotFoundError } from "../errors/problem.errors";

const requireSlug = (raw: unknown): string => {
  const slug = String(raw ?? "").trim();
  if (!slug) {
    throw new ProblemNotFoundError();
  }
  return slug;
};

/** POST /api/practice/problems/:slug/submit */
export const submitPracticeSolution = async (req: AuthRequest, res: Response) => {
  const slug = requireSlug(req.params.slug);
  const data = SubmitDsaSchema.parse(req.body);
  const result = await practiceService.submitPracticeSolution(slug, req.userId, data);
  return sendSuccess(res, result, 202);
};

/** GET /api/practice/submissions/:submissionId */
export const getPracticeSubmission = async (req: AuthRequest, res: Response) => {
  const submissionId = parseInt(String(req.params.submissionId), 10);
  if (isNaN(submissionId)) {
    throw new ProblemNotFoundError();
  }
  const submission = await practiceService.getPracticeSubmission(submissionId, req.userId);
  return sendSuccess(res, submission, 200);
};

/** GET /api/practice/problems/:slug/submissions */
export const getPracticeHistory = async (req: AuthRequest, res: Response) => {
  const slug = requireSlug(req.params.slug);
  const submissions = await practiceService.getPracticeHistory(slug, req.userId);
  return sendSuccess(res, submissions, 200);
};

/** GET /api/practice/problems/:slug/draft */
export const getPracticeDraft = async (req: AuthRequest, res: Response) => {
  const slug = requireSlug(req.params.slug);
  const draft = await practiceService.getPracticeDraft(slug, req.userId);
  return sendSuccess(res, draft, 200);
};

/** PUT /api/practice/problems/:slug/draft */
export const savePracticeDraft = async (req: AuthRequest, res: Response) => {
  const slug = requireSlug(req.params.slug);
  const data = SubmitDsaSchema.parse(req.body);
  await practiceService.savePracticeDraft(slug, req.userId, data);
  return sendSuccess(res, { success: true }, 200);
};
