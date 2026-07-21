import { Response } from "express";
import { AuthRequest } from "../types/express.d";
import { sendSuccess } from "../util/response";
import * as adminLearnService from "../service/adminLearn.service";
import {
  CreateLearnPathSchema,
  UpdateLearnPathSchema,
  CreateLearnModuleSchema,
  UpdateLearnModuleSchema,
  CreateLearnLessonSchema,
  UpdateLearnLessonSchema,
  AttachLearnQuestionSchema,
  UpdateLearnQuestionSchema,
  ReorderSchema,
} from "../schema/learn.schema";
import {
  LearnPathNotFoundError,
  LearnModuleNotFoundError,
  LearnLessonNotFoundError,
  LearnQuestionNotFoundError,
} from "../errors/learn.errors";

/** Numeric route params, rejected as a 404 rather than a 500 on garbage input. */
const intParam = (raw: unknown, notFound: () => never): number => {
  const value = parseInt(String(raw), 10);
  if (isNaN(value)) notFound();
  return value;
};

const pathId = (req: AuthRequest) =>
  intParam(req.params.pathId, () => {
    throw new LearnPathNotFoundError();
  });

const moduleId = (req: AuthRequest) =>
  intParam(req.params.moduleId, () => {
    throw new LearnModuleNotFoundError();
  });

const lessonId = (req: AuthRequest) =>
  intParam(req.params.lessonId, () => {
    throw new LearnLessonNotFoundError();
  });

const questionId = (req: AuthRequest) =>
  intParam(req.params.questionId, () => {
    throw new LearnQuestionNotFoundError();
  });

// --- Paths ---

export const listPaths = async (_req: AuthRequest, res: Response) =>
  sendSuccess(res, await adminLearnService.listPaths());

export const getPath = async (req: AuthRequest, res: Response) =>
  sendSuccess(res, await adminLearnService.getPathTree(pathId(req)));

export const createPath = async (req: AuthRequest, res: Response) =>
  sendSuccess(res, await adminLearnService.createPath(CreateLearnPathSchema.parse(req.body)), 201);

export const updatePath = async (req: AuthRequest, res: Response) =>
  sendSuccess(
    res,
    await adminLearnService.updatePath(pathId(req), UpdateLearnPathSchema.parse(req.body)),
  );

export const archivePath = async (req: AuthRequest, res: Response) =>
  sendSuccess(res, await adminLearnService.archivePath(pathId(req)));

export const validatePath = async (req: AuthRequest, res: Response) => {
  const problems = await adminLearnService.validatePathForPublish(pathId(req));
  return sendSuccess(res, { publishable: problems.length === 0, problems });
};

export const getPathImpact = async (req: AuthRequest, res: Response) =>
  sendSuccess(res, await adminLearnService.getPathImpact(pathId(req)));

// --- Modules ---

export const createModule = async (req: AuthRequest, res: Response) =>
  sendSuccess(
    res,
    await adminLearnService.createModule(pathId(req), CreateLearnModuleSchema.parse(req.body)),
    201,
  );

export const updateModule = async (req: AuthRequest, res: Response) =>
  sendSuccess(
    res,
    await adminLearnService.updateModule(moduleId(req), UpdateLearnModuleSchema.parse(req.body)),
  );

export const deleteModule = async (req: AuthRequest, res: Response) => {
  await adminLearnService.deleteModule(moduleId(req));
  return sendSuccess(res, { deleted: true });
};

export const reorderModule = async (req: AuthRequest, res: Response) =>
  sendSuccess(
    res,
    await adminLearnService.reorderModule(moduleId(req), ReorderSchema.parse(req.body).targetIndex),
  );

// --- Lessons ---

export const createLesson = async (req: AuthRequest, res: Response) =>
  sendSuccess(
    res,
    await adminLearnService.createLesson(moduleId(req), CreateLearnLessonSchema.parse(req.body)),
    201,
  );

export const updateLesson = async (req: AuthRequest, res: Response) =>
  sendSuccess(
    res,
    await adminLearnService.updateLesson(lessonId(req), UpdateLearnLessonSchema.parse(req.body)),
  );

export const deleteLesson = async (req: AuthRequest, res: Response) => {
  await adminLearnService.deleteLesson(lessonId(req));
  return sendSuccess(res, { deleted: true });
};

export const reorderLesson = async (req: AuthRequest, res: Response) =>
  sendSuccess(
    res,
    await adminLearnService.reorderLesson(lessonId(req), ReorderSchema.parse(req.body).targetIndex),
  );

// --- Questions ---

export const attachQuestion = async (req: AuthRequest, res: Response) =>
  sendSuccess(
    res,
    await adminLearnService.attachQuestion(lessonId(req), AttachLearnQuestionSchema.parse(req.body)),
    201,
  );

export const updateQuestion = async (req: AuthRequest, res: Response) =>
  sendSuccess(
    res,
    await adminLearnService.updateQuestion(
      questionId(req),
      UpdateLearnQuestionSchema.parse(req.body).note,
    ),
  );

export const detachQuestion = async (req: AuthRequest, res: Response) => {
  await adminLearnService.detachQuestion(questionId(req));
  return sendSuccess(res, { deleted: true });
};

export const reorderQuestion = async (req: AuthRequest, res: Response) =>
  sendSuccess(
    res,
    await adminLearnService.reorderQuestion(
      questionId(req),
      ReorderSchema.parse(req.body).targetIndex,
    ),
  );

// --- Picker support ---

export const getProblemUsage = async (req: AuthRequest, res: Response) => {
  const problemId = intParam(req.params.problemId, () => {
    throw new LearnPathNotFoundError();
  });
  return sendSuccess(res, await adminLearnService.getProblemUsage(problemId));
};
