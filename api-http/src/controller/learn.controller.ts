import { Response } from "express";
import { AuthRequest } from "../types/express.d";
import { sendSuccess } from "../util/response";
import * as learnService from "../service/learn.service";
import { AnswerMcqSchema } from "../schema/learn.schema";
import {
  LearnLessonNotFoundError,
  LearnQuestionNotFoundError,
  LearnPathNotFoundError,
} from "../errors/learn.errors";
import { AppError } from "../errors/app-error";

export const getGallery = async (req: AuthRequest, res: Response) =>
  sendSuccess(res, await learnService.getGallery(req.userId));

export const getPath = async (req: AuthRequest, res: Response) =>
  sendSuccess(res, await learnService.getPath(String(req.params.slug), req.userId));

export const getLesson = async (req: AuthRequest, res: Response) => {
  const lessonId = parseInt(String(req.params.lessonId), 10);
  if (isNaN(lessonId)) throw new LearnLessonNotFoundError();

  return sendSuccess(res, await learnService.getLesson(lessonId, req.userId));
};

const questionId = (req: AuthRequest): number => {
  const value = parseInt(String(req.params.questionId), 10);
  if (isNaN(value)) throw new LearnQuestionNotFoundError();
  return value;
};

export const selfMarkQuestion = async (req: AuthRequest, res: Response) =>
  sendSuccess(res, await learnService.selfMarkQuestion(questionId(req), req.userId));

export const unmarkQuestion = async (req: AuthRequest, res: Response) =>
  sendSuccess(res, await learnService.unmarkQuestion(questionId(req), req.userId));

export const unlockModule = async (req: AuthRequest, res: Response) => {
  const moduleId = parseInt(String(req.params.moduleId), 10);
  if (isNaN(moduleId)) throw new LearnPathNotFoundError();

  return sendSuccess(res, await learnService.unlockModule(moduleId, req.userId));
};

export const resetPath = async (req: AuthRequest, res: Response) =>
  sendSuccess(res, await learnService.resetPath(String(req.params.slug), req.userId));

export const answerMcq = async (req: AuthRequest, res: Response) => {
  const { selectedOptionIndex } = AnswerMcqSchema.parse(req.body);

  return sendSuccess(
    res,
    await learnService.gradeMcqAnswer(questionId(req), req.userId, selectedOptionIndex),
  );
};

const moduleIdParam = (req: AuthRequest): number => {
  const value = parseInt(String(req.params.moduleId), 10);
  if (isNaN(value)) throw new LearnPathNotFoundError();
  return value;
};

const lessonIdParam = (req: AuthRequest): number => {
  const value = parseInt(String(req.params.lessonId), 10);
  if (isNaN(value)) throw new LearnLessonNotFoundError();
  return value;
};

export const getCelebrations = async (req: AuthRequest, res: Response) => {
  const path = await learnService.getPathIdBySlug(String(req.params.slug));
  return sendSuccess(res, await learnService.getCelebrations(req.userId, path));
};

export const acknowledgeLesson = async (req: AuthRequest, res: Response) =>
  sendSuccess(
    res,
    await learnService.acknowledgeLessonCelebration(lessonIdParam(req), req.userId),
  );

export const acknowledgeModule = async (req: AuthRequest, res: Response) =>
  sendSuccess(
    res,
    await learnService.acknowledgeModuleCelebration(moduleIdParam(req), req.userId),
  );

export const getNextQuestion = async (req: AuthRequest, res: Response) =>
  sendSuccess(
    res,
    await learnService.getNextQuestion(
      String(req.params.slug),
      questionId(req),
      req.userId,
    ),
  );

/**
 * GET /api/learn/paths/:slug/export — the progress spreadsheet.
 *
 * Sends a raw buffer rather than going through `sendSuccess`: this is a file
 * download, so wrapping it in the `{ success, data }` envelope would hand the
 * browser JSON to save as .xlsx.
 */
export const exportPathProgress = async (req: AuthRequest, res: Response) => {
  const { buffer, filename } = await learnService.exportPathProgress(
    String(req.params.slug),
    req.userId,
  );

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  // The filename is built from a path slug, so it has no quotes or newlines to
  // escape — but it is still sent as a quoted string so a future slug rule
  // permitting spaces can't split the header.
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  // Progress is per-user; a shared cache must never serve one learner's sheet
  // to another.
  res.setHeader("Cache-Control", "private, no-store");

  return res.send(buffer);
};

/** POST /api/learn/paths/:slug/import — apply an edited spreadsheet. */
export const importPathProgress = async (req: AuthRequest, res: Response) => {
  if (!req.file?.buffer?.length) {
    throw new AppError(
      "Attach the spreadsheet you exported, as a .xlsx file.",
      400,
      "LEARN_IMPORT_NO_FILE",
    );
  }

  return sendSuccess(
    res,
    await learnService.importPathProgress(
      String(req.params.slug),
      req.userId,
      req.file.buffer,
    ),
  );
};
