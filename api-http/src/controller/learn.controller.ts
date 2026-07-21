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
